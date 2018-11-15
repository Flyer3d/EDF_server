const httpStatus = require('http-status');
const { handler } = require('../../middlewares/error');
const { EDFAssert } = require('../../utils/Assert');
const _ = require('lodash');
const EDF = require('../../../config/EDF');
const logger = require('../../utils/Logger')(module);

exports.getList = async (req, res) => {
  const { query } = req;
  const userRoles = _.get(req, 'user.roles', []);
  logger.info('[getList] Getting ACTIONS list:');
  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        searchParams: {
          entityName: query.model || 'EDF_PoolModel',
          query: query.query || '',
          orderBy: query.orderBy || ''
        },
        paging: {
          pageNumber: query.pageNumber || 1,
          pageSize: query.pageSize || 99
        }
      }
    });
    const response = _.get(result, 'data');
    logger.debug('[getList] Actions list getted!');

    response.rows = response.rows.map((item) => {
      const newItem = item;
      // ToDo: Костыль! Убрать!!!
      newItem.object.startEventPk = _.get(item.object, 'startEventPk.entityInstancePk.entityInstanceId');
      return newItem;
    });

    // ToDo: HARDCODE!!!! Remove it now!!!
    if (userRoles.indexOf('role.admin') !== -1) {
      logger.info('[getList] ADMIN! Returning full list!');
      logger.info(response);
      res.status(httpStatus.OK);
      return res.json(response).end();
    }

    const accesRequestArr = response.rows.map(item => ({
      className: _.get(item, 'entityInstancePk.entityName'),
      instanceId: _.get(item, 'entityInstancePk.entityInstanceId'),
      accessType: 'EXECUTE'
    }));
    if (!_.isEmpty(accesRequestArr)) {
      const accessRightsArr = await Promise.all(accesRequestArr.map(async (item) => {
        try {
          const accessSrc = await EDFAssert({
            url: `${EDF.data.coreEndpoint}/authentication/v1/getInf`,
            method: 'post',
            responseType: 'json',
            headers: { Authorization: req.headers.authorization },
            data: {
              className: item.className,
              instanceId: item.instanceId,
              accessType: item.accessType
            }
          });
          logger.info(`[getList] Getted AccessRights for ${item.className}:${item.instanceId}`);
          logger.info(accessSrc);
          return accessSrc;
        } catch (err) {
          logger.error(`[getList] Error access right for ${item.className}:${item.instanceId}!`);
          logger.error(err.message);
          return null;
        }
      }));
      logger.info('[getList] Finaly accessRightsArr is:');
      logger.info(accessRightsArr);

      const filteredRows = response.rows.filter((item, index) => accessRightsArr[index].access === 'GRANTED');
      response.rows = filteredRows;
      response.paging.pageSize = filteredRows && filteredRows.length;
      response.paging.totalRows = filteredRows && filteredRows.length;
      logger.info('[getList] Filtered actions list getted:');
      logger.info(response);
      res.status(httpStatus.OK);
      return res.json(response).end();
    }
    response.rows = [];
    response.paging.pageSize = 1;
    response.paging.totalRows = 0;

    logger.info('[getList] Nothing to show');
    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error('[getList] Error getting actions list!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.doAction = async (req, id, res) => {
  const actionId = id;
  const { entityInstance } = req.body;
  const entityInstancePks = [];
  if (entityInstance && entityInstance.entityName && entityInstance.entityInstanceId) {
    entityInstancePks.push(entityInstance);
  }
  logger.info(`[doAction] Starting event with id = ${actionId} @ ${EDF.data.coreEndpoint}/startEvent`);
  logger.info(entityInstancePks);
  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/startEvent`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        authContext: {
          login: (req.user && req.user.username) || 'anonymous',
          superUser: true
        },
        eventPk: {
          id: Number(actionId)
        },
        entityInstancePks
      }
    });

    const response = _.get(result, 'data');

    logger.info('[doAction] Event successfully started');
    logger.info(result);
    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error(`[doAction] Axios error load ${EDF.data.coreEndpoint}/startEvent`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};

