const httpStatus = require('http-status');
const { handler } = require('../middlewares/error');
const { EDFAssert } = require('../utils/Assert');
const _ = require('lodash');
const EDF = require('../../config/EDF');
const logger = require('../utils/Logger')(module);


exports.getList = async (req, res) => {
  const { entityType } = req.body;
  const user = req.user || {};
  const userPublicId = user.userId;
  logger.info(`[GetList] Getting bookmarks list with tentityType = ${entityType}`);

  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        searchParams: {
          entityName: 'WEB_Bookmark',
          query: `[userPublicId] = '${userPublicId}'${entityType ? ` AND [entityType] = '${entityType}'` : ''}`,
          orderBy: ''
        },
        paging: {
          pageNumber: 1,
          pageSize: 1000
        }
      }
    });

    const response = _.get(result, 'data');

    logger.info('[GetList] Bookmarks list data:');
    logger.info(response);

    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error('[GetList] Error getting bookmark list data!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.addBookmark = async (req, res) => {
  const { entityType, entityDesc, entityId } = req.body;
  const userPublicId = req.user.userId;
  logger.info('[addBookmark] Adding new bookmark for user');
  logger.info(req.body);
  try {
    logger.debug('[addBookmark] Finding existing entity!!');
    const searchRes = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        searchParams: {
          entityName: 'WEB_Bookmark',
          query: `[entityType] = '${entityType}' AND [entityId] = '${entityId}' AND [userPublicId] = '${userPublicId}'`,
          orderBy: ''
        },
        paging: {
          pageNumber: 1,
          pageSize: 1
        }
      }
    });
    logger.debug('[addBookmark] Existing entity list is:');
    logger.debug(searchRes.data);

    if (_.get(searchRes, 'data.rows.length') > 0) {
      const id = _.get(searchRes, 'data.rows[0].entityInstancePk.entityInstanceId');
      const updateRes = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/updateEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          entityInstances: [{
            entityInstancePk: {
              entityName: 'WEB_Bookmark',
              entityInstanceId: id
            },
            object: {
              entityType,
              entityId,
              entityDesc,
              userPublicId
            }
          }]
        }
      });
      logger.info('[addBookmark] Bookmark updated!');
      logger.info(_.get(updateRes, 'data.rows[0]'));
      res.status(httpStatus.OK);
      return res.json(_.get(updateRes, 'data.rows[0]')).end();
    }
    const createRes = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/createEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        entityInstances: [{
          entityName: 'WEB_Bookmark',
          object: {
            entityType,
            entityId,
            entityDesc,
            userPublicId
          }
        }]
      }
    });
    logger.debug('[addBookmark] Bookmark created!');
    logger.debug(_.get(createRes, 'data.rows[0]'));
    res.status(httpStatus.CREATED);
    return res.json(_.get(createRes, 'data.rows[0]')).end();
  } catch (err) {
    logger.error('[addBookmark] Error creating bookmark!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.removeBookmark = async (req, res) => {
  let { id } = req.body;
  if (Number.isNaN(Number(id))) {
    if (typeof (id) === 'object') {
      id = _.get(id, 'entityInstancePk.entityInstanceId');
    } else {
      id = _.get(JSON.parse(id), 'entityInstancePk.entityInstanceId');
    }
  }
  logger.info(`[removeBookmark] Delete bookmark with id = ${id}`);
  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/deleteEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        entityInstancePks: [{
          entityName: 'WEB_Bookmark',
          entityInstanceId: Number(id)
        }]
      }
    });
    logger.info('[removeBookmark] Bookmark removed successfully:');
    logger.debug(result);
    return res.status(httpStatus.NO_CONTENT).end();
  } catch (err) {
    logger.error('[removeBookmark] Error removing bookmark!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};
