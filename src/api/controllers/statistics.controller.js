const httpStatus = require('http-status');
const moment = require('moment');
const { handler, badRequest } = require('../middlewares/error');
const { EDFAssert } = require('../utils/Assert');
const _ = require('lodash');
const EDF = require('../../config/EDF');
const logger = require('../utils/Logger')(module);


const viewStatisticsName = 'WEB_View';

exports.viewed = async (req, res) => {
  const { type } = req.body;
  const userPublicId = req.user.userId;
  const now = moment().format();
  logger.info(`[viewed] Saving view for type ${type}`);
  if (type === 'project') {
    const { projectId } = req.body;
    if (!projectId) {
      logger.error('[viewed] Bad request: parameter \'projectId\' required for type = project!');
      return badRequest('parameter \'projectId\' required for type = project!', req, res);
    }
    try {
      const result = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/createEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          entityInstances: [{
            entityName: viewStatisticsName,
            object: {
              user_id: userPublicId,
              date: now,
              type,
              projectId
            }
          }]
        }
      });
      logger.debug('[viewed] View saved! Responce is:');
      logger.debug(_.get(result, 'data.rows[0]'));
      res.status(httpStatus.CREATED);
      return res.end();
    } catch (err) {
      logger.error('[viewed] Axios error');
      logger.error(err.message);
      return handler(err, req, res);
    }
  } else {
    logger.error(`[viewed] Bad request: Unsupported type '${type}'!`);
    return badRequest(`Unsupported type '${type}'!`, req, res);
  }
};

exports.getViews = async (req, res) => {
  const { type, fromDate } = req.body;
  const query = [];
  if (fromDate) {
    query.push(`[date] >= '${fromDate}'`);
  }
  logger.info(`[getViews] Getting views for type '${type}'`);
  if (type === 'project') {
    const { projectId } = req.body;
    if (!projectId) {
      logger.error('[getViews]  Bad request: parameter \'projectId\' required for type = project!');
      return badRequest('parameter \'projectId\' required for type = project!', req, res);
    }
    query.push(`[projectId] = '${projectId}'`);
    try {
      const result = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          searchParams: {
            entityName: viewStatisticsName,
            query: query.join(' AND '),
            orderBy: 'date DESC'
          },
          paging: {
            pageNumber: 1,
            pageSize: 1000
          }
        }
      });
      const response = _.get(result, 'data');

      logger.info('[getViews] Chat list data:');
      logger.info(response);

      res.status(httpStatus.OK);
      return res.json(response).end();
    } catch (err) {
      logger.error('[getViews] Axios error');
      logger.error(err.message);
      return handler(err, req, res);
    }
  } else {
    logger.error(`[getViews] Bad request: Unsupported type '${type}'!`);
    return badRequest(`Unsupported type '${type}'!`, req, res);
  }
};

