
import { getManager, getRepository } from 'typeorm';
import { assert } from '../utils/assert';
import { assertRole } from "../utils/assertRole";
import { handlerWrapper } from '../utils/asyncHandler';
import { SystemConfig } from '../entity/Config';
import { getOrgIdFromReq } from '../utils/getOrgIdFromReq';
import { OrgConfig } from '../entity/OrgConfig';

export const listConfig = handlerWrapper(async (req, res) => {
  assertRole(req, 'system', 'admin');
  const orgId = getOrgIdFromReq(req);
  const whereClause = orgId ? { where: { orgId }} : null;
  const list = await getRepository(orgId ? OrgConfig : SystemConfig).find({
    ...whereClause,
    order: { key: 'ASC' }
  });
  res.json(list);
});

export const saveConfig = handlerWrapper(async (req, res) => {
  assertRole(req, 'admin');
  const orgId = getOrgIdFromReq(req);
  const { key, value } = req.body;
  assert(key, 400, 'Translation value is empty');
  const item = orgId ? new OrgConfig() : new SystemConfig();
  item.key = key;
  item.value = value;
  if (orgId) {
    (item as OrgConfig).orgId = orgId;
  }

  await getManager()
    .createQueryBuilder()
    .insert()
    .into(orgId ? OrgConfig : SystemConfig)
    .values(item)
    .onConflict(`(${orgId ? `"orgId", ` :''}key) DO UPDATE SET value = excluded.value`)
    .execute();

  res.json();
});
