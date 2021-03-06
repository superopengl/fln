
import { getRepository, getManager, Brackets } from 'typeorm';
import { File } from '../entity/File';
import { assert } from '../utils/assert';
import { handlerWrapper } from '../utils/asyncHandler';
import { assertRole } from "../utils/assertRole";
import { getNow } from '../utils/getNow';
import { Task } from '../entity/Task';
import { getS3ObjectStream, uploadToS3 } from '../utils/uploadToS3';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '../types/Role';
import { getUserIdFromReq } from '../utils/getUserIdFromReq';
import { getOrgIdFromReq } from '../utils/getOrgIdFromReq';
import { existsQuery } from '../utils/existsQuery';
import { UserAuthOrg } from '../entity/UserAuthOrg';

function streamFileToResponse(file: File, res) {
  assert(file, 404);

  const { id, fileName, mime } = file;

  const stream = getS3ObjectStream(id, fileName);
  res.setHeader('Content-type', mime);
  res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
  res.setHeader('Cache-Control', `public, max-age=31536000`);

  stream.pipe(res);
}

export const downloadFile = handlerWrapper(async (req, res) => {
  assertRole(req, 'system', 'admin', 'client', 'agent');
  const { taskId, fileId } = req.params;
  const { user: { id: userId, role } } = req as any;

  const taskRepo = getRepository(Task);
  const task = await taskRepo.findOne(taskId);
  assert(task, 404);

  const fileRepo = getRepository(File);
  const file = await fileRepo.findOne(fileId);
  assert(file, 404);

  const taskDoc = task.docs.find(d => d.fileId === fileId);
  assert(taskDoc, 404);

  if (role === 'client') {
    assert(task.userId === userId, 404);
    // // Only record the read by client
    const now = getNow();
    taskDoc.lastReadAt = now;
    await taskRepo.save(task);

    file.lastReadAt = now;
    await fileRepo.save(file);
  }

  streamFileToResponse(file, res);
});

export const getPrivateFileStream = handlerWrapper(async (req, res) => {
  assertRole(req, 'system', 'admin', 'client', 'agent');
  const { id } = req.params;
  const user = (req as any).user;
  const userId = user.id;
  const role = user.role;

  const m = getManager();
  let queryBuilder = m
    .getRepository(File)
    .createQueryBuilder('f')
    .where(`id = :id`, { id })
  switch (role) {
    case Role.Admin:
    case Role.Agent:
      const orgId = getOrgIdFromReq(req);
      queryBuilder = queryBuilder.andWhere(
        new Brackets(qb => qb
          .where(`owner = :userId`, { userId })
          .orWhere(existsQuery(m
            .getRepository(UserAuthOrg)
            .createQueryBuilder('a')
            .where(`a."userId" = f.owner`)
            .andWhere(`a."orgId" = '${orgId}'`)
          ))
        )
      );
      break;
    case Role.Client:
      queryBuilder = queryBuilder.andWhere(`owner = :userId`, { userId });
    case Role.System:
      break;
    default:
      assert(false, 500, 'Impossible code path')
  }
  const file = await queryBuilder.getOne();

  streamFileToResponse(file, res);
});

export const getPublicFileStream = handlerWrapper(async (req, res) => {
  const { id } = req.params;
  const file = await getRepository(File).findOne({ id, public: true });

  streamFileToResponse(file, res);
});

export const getFileMeta = handlerWrapper(async (req, res) => {
  const { id } = req.params;
  const repo = getRepository(File);
  const file = await repo.findOne(id);
  assert(file, 404);
  res.json(file);
});

export const searchFileMetaList = handlerWrapper(async (req, res) => {
  const { ids } = req.body;
  const files = await getRepository(File)
    .createQueryBuilder()
    .where('id IN (:...ids)', { ids })
    .getMany();
  res.json(files);
});


export const uploadFile = handlerWrapper(async (req, res) => {
  assertRole(req, 'system', 'admin', 'client', 'agent');
  const { file } = (req as any).files;
  assert(file, 404, 'No file to upload');
  const { name, data, mimetype, md5 } = file;
  const userId = getUserIdFromReq(req);

  const id = uuidv4();
  const location = await uploadToS3(id, name, data);

  const entity: File = {
    id,
    owner: userId,
    fileName: name,
    mime: mimetype,
    location,
    md5,
    public: !!req.query.public
  };

  const repo = getRepository(File);
  await repo.insert(entity);

  res.json(entity);
});