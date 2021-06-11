import { getManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';
import { Subscription } from '../entity/Subscription';
import { SubscriptionType } from '../types/SubscriptionType';
import { SubscriptionStatus } from '../types/SubscriptionStatus';
import { CreditTransaction } from '../entity/CreditTransaction';
import { getNewSubscriptionPaymentInfo } from './getNewSubscriptionPaymentInfo';
import { PaymentStatus } from '../types/PaymentStatus';
import { Payment } from '../entity/Payment';
import { assert } from './assert';
import { getRequestGeoInfo } from './getIpGeoLocation';
import { chargeStripeForCardPayment, getOrgStripeCustomerId } from '../services/stripeService';
import { User } from '../entity/User';
import { setSeatsForOrg } from './setSeatsForOrg';

export type PurchaseSubscriptionRequest = {
  orgId: string;
  seats: number;
  promotionCode: string;
};

export async function purchaseNewSubscriptionWithPrimaryCard(request: PurchaseSubscriptionRequest, expressReq: any) {
  const { orgId, seats, promotionCode } = request;
  assert(orgId, 400, 'orgId is empty');
  assert(seats > 0, 400, 'seats must be positive integer');

  const now = moment.utc();
  const start = now.toDate();
  const end = now.add(1, 'month').add(-1, 'day').toDate();

  await getManager().transaction(async m => {
    const { creditBalance, minSeats, seats: expectedSeats, price, payable, refundable, paymentMethodId, stripePaymentMethodId } = await getNewSubscriptionPaymentInfo(m, orgId, seats, promotionCode);
    assert(expectedSeats < minSeats, 400, `${minSeats} are being used in your organization. Please remove members before reducing license count.`);
    assert(expectedSeats === minSeats, 400, `${minSeats} are being used in your organization. There is no need to adjust.`);

    // Set seats (add more or delete some)
    await setSeatsForOrg(m, orgId, expectedSeats);

    // Call stripe to pay
    const stripeCustomerId = await getOrgStripeCustomerId(m, orgId);
    const stripeRawResponse = await chargeStripeForCardPayment(payable, stripeCustomerId, stripePaymentMethodId, true);

    // Terminate current subscription
    await m.update(Subscription, {
      orgId,
      status: SubscriptionStatus.Alive
    }, {
      end: now.toDate(),
      status: SubscriptionStatus.Terminated
    });

    // Create new alive subscription
    const subscription = new Subscription();
    subscription.id = uuidv4();
    subscription.orgId = orgId;
    subscription.type = SubscriptionType.Monthly;
    subscription.start = start;
    subscription.seats = seats;
    subscription.recurring = true;
    subscription.status = SubscriptionStatus.Alive;
    await m.save(subscription);

    // Handle refund credit from current unfinished subscrption
    if(refundable > 0) {
      const refundCreditTransaction = new CreditTransaction();
      refundCreditTransaction.orgId = orgId;
      refundCreditTransaction.amount = refundable;
      refundCreditTransaction.type = 'refund';
      await m.save(refundCreditTransaction);
    }

    // Pay with credit as possible
    let creditTransaction = null;
    if (creditBalance > 0) {
      creditTransaction = new CreditTransaction();
      creditTransaction.orgId = orgId;
      creditTransaction.amount = -1 * (price - payable);
      creditTransaction.type = 'deduct';
      await m.save(creditTransaction);
    }

    // Create payment entity
    const payment = new Payment();
    payment.id = uuidv4();
    payment.orgId = orgId;
    payment.start = start;
    payment.end = end;
    payment.rawResponse = stripeRawResponse;
    payment.paidAt = new Date();
    payment.amount = payable;
    payment.status = PaymentStatus.Paid;
    payment.auto = false;
    payment.geo = await getRequestGeoInfo(expressReq);
    payment.orgPaymentMethodId = paymentMethodId;
    payment.creditTransaction = creditTransaction;
    payment.subscription = subscription;

    await m.save(payment);

    // Update org users to paid
    await m.getRepository(User).update({
      orgId,
    }, {
      paid: true
    });
  });
}




