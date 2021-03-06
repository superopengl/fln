import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserStatus } from '../types/UserStatus';
import { enqueueEmail } from '../services/emailService';
import { getEmailRecipientName } from './getEmailRecipientName';
import { EmailTemplateType } from '../types/EmailTemplateType';


export async function inviteOrgMemberWithSendingEmail(m: EntityManager, user, profile) {
  const resetPasswordToken = uuidv4();
  user.resetPasswordToken = resetPasswordToken;
  user.status = UserStatus.ResetPassword;

  await m.save(profile);
  user.profile = profile;
  await m.save(user);

  const url = `${process.env.ZDN_API_DOMAIN_NAME}/r/${resetPasswordToken}/`;
  const email = profile.email;
  await enqueueEmail({
    to: email,
    template: EmailTemplateType.InviteOrgMember,
    vars: {
      toWhom: getEmailRecipientName(user.profile),
      email,
      url
    },
    shouldBcc: false
  });
}
