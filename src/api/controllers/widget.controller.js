const httpStatus = require('http-status');
const { handler } = require('../middlewares/error');
const { EDFAssert } = require('../utils/Assert');
const _ = require('lodash');
const EDF = require('../../config/EDF');
const logger = require('../utils/Logger')(module);

exports.suggest = async (req, res) => {
  logger.info('[suggest] With query:');
  logger.info(req.query);
  const login = (req.user && req.user.username) || 'anonymous';
  const {
    q, model, field, isDropdownLink, query
  } = req.query;
  if (!(model)) {
    return res.json([]).end();
  }
  if (isDropdownLink) {
    logger.info('[suggest] Finding list for dropdown!');
    try {
      logger.info('[suggest] Finding using Model only!');
      const str = q ? q.toLowerCase() : '';
      const result = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: login,
          searchParams: {
            entityName: model,
            orderBy: '',
            query
          },
          paging: {
            pageNumber: 1,
            pageSize: 999999
          }
        }
      });
      const response = _.get(result, 'data.rows', []);
      logger.info('[suggest] Response Resived!');
      logger.info(response);
      let filteredResult;
      if (q) {
        filteredResult = response
          .filter(item => Boolean(item.entityDesc) && (item.entityDesc.toLowerCase().indexOf(str) !== -1))
          .sort((a, b) => a.name && a.name.localeCompare(b.name))
          .map((itemSrc) => {
            const item = itemSrc;
            delete item.object;
            return item;
          }) || [];
      } else {
        filteredResult = response
          .sort((a, b) => a.name && a.name.localeCompare(b.name))
          .map((itemSrc) => {
            const item = itemSrc;
            delete item.object;
            return item;
          }) || [];
      }
      logger.info('[suggest] Returning filtered list');
      logger.info(filteredResult);
      res.status(httpStatus.OK);
      return res.json(filteredResult).end();
    } catch (err) {
      logger.error(`[suggest] Error getting list for model ${model}!`);
      logger.error(err.message);
      return handler(err, req, res);
    }
  }
  const { lists } = EDF.data;
  if (lists && lists[model] && lists[model][field]) {
    const result = lists[model][field] || [];
    if (!q) {
      res.status(httpStatus.OK);
      logger.info('[suggest] Returning full list');
      return res.json(result).end();
    }
    const str = q.toLowerCase();
    const filteredResult = result
      .filter(item => (item.toLowerCase().indexOf(str) !== -1)) || [];
    logger.info('[suggest] Returning filtered list');
    logger.info(filteredResult);
    res.status(httpStatus.OK);
    return res.json(filteredResult).end();
  }
  logger.info('[suggest] List not found!!!');
  res.status(httpStatus.OK);
  return res.json([]).end();
};

exports.getList = async (req, res) => {
  const { query } = req;
  const user = req.user || {};
  const userRoles = user.roles || [];
  const login = (req.user && req.user.username) || 'anonymous';
  let createdBy;
  logger.info('[GetList] Getting widget list with params:');
  logger.info(query);
  if ((query.userOnly === 'true') && (userRoles.indexOf('admin') === -1 && userRoles.indexOf('head') === -1 && userRoles.indexOf('web_admin') === -1)) {
    createdBy = [user.username];
  }
  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: login,
        searchParams: {
          createdBy,
          entityName: query.model,
          query: query.query || '',
          orderBy: query.orderBy || ''
        },
        paging: {
          pageNumber: Number(query.pageNumber) || 1,
          pageSize: Number(query.pageSize) || 10
        }
      }
    });

    const response = _.get(result, 'data');
    logger.debug('[getList] Raw list is:');
    logger.debug(response);
    if (_.isEmpty(_.get(response, 'rows'))) {
      res.status(httpStatus.OK);
      return res.json(response).end();
    }
    logger.info('[GetList] Filtered list data:');
    logger.info(response);

    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error('[GetList] Error getting widget list data!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.createItem = async (req, res) => {
  const { body } = req;
  const { model, data } = body.data;
  logger.info(`[createItem] Create entity model = ${model}`);
  logger.info(body);
  try {
    logger.debug('[createItem] Creating entity!!');

    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/createEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstances: [{
          entityName: model,
          object: data
        }]
      }
    });
    logger.debug('[createItem] Responce is:');
    logger.debug(_.get(result, 'data.rows[0]'));
    res.status(httpStatus.CREATED);
    return res.json(_.get(result, 'data.rows[0]')).end();
  } catch (err) {
    logger.error('[createItem] Axios error');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.getItem = async (req, model, modelId, res) => {
  logger.info(`[getItem] Getting widget ITEM with params: MODEL = ${model},` +
    `ModelID = ${modelId} type = ${typeof modelId}`);
  let id = modelId;
  if (Number.isNaN(Number(id))) {
    if (typeof (id) === 'object') {
      id = _.get(id, 'entityInstancePk.entityInstanceId');
    } else {
      id = _.get(JSON.parse(id), 'entityInstancePk.entityInstanceId');
    }
  }

  logger.info(`[getItem] Getting widget ITEM with params: MODEL = ${model}, ID = ${id}`);
  const login = (req.user && req.user.username) || 'anonymous';
  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: login,
        entityInstancePks: [{
          entityName: model,
          entityInstanceId: Number(id)
        }]
      }
    });
    const response = _.get(result, 'data');
    logger.info(`[getItem] Successfully getting widget Item id = ${id}`);
    logger.info(response);
    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error(`[getItem] Error getting widgetItem id = ${id}`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.getItems = async (req, model, res) => {
  logger.info(`[getItem] Getting widget ITEM with params: MODEL = ${model}`);
  logger.debug(req.query);
  const { query } = req;
  const ids = JSON.parse(query.ids);
  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: ids.map(id => ({
          entityName: model,
          entityInstanceId: id
        }))
      }
    });

    const response = _.get(result, 'data');
    logger.info(`[getItem] Successfully getting widget Item ids = ${ids}`);
    logger.info(response);
    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error(`[getItem] Error getting widgetItem ids = ${ids}`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.saveItem = async (req, model, modelId, res) => {
  let id = modelId;
  if (Number.isNaN(Number(id))) {
    if (typeof (id) === 'object') {
      id = _.get(id, 'entityInstancePk.entityInstanceId');
    } else {
      id = _.get(JSON.parse(id), 'entityInstancePk.entityInstanceId');
    }
  }
  logger.info(`[saveItem] Save with id = ${id}, model = ${model}, fields:`);
  const { fields } = req.body;
  logger.info(fields);
  try {
    logger.debug('[saveItem] Updating fields:');
    logger.debug(fields);
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/updateEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstances: [{
          entityInstancePk: {
            entityName: model,
            entityInstanceId: Number(id)
          },
          object: fields
        }]
      }
    });
    logger.debug('[saveItem] Responce is:');
    logger.debug(result.data);

    const response = _.get(result, 'data');
    logger.info('\nSuccessfully updating data!');
    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error(`[saveItem] Axios error updating item ${model}::${id}`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.deleteItem = async (req, model, modelId, res) => {
  let id = modelId;
  if (Number.isNaN(Number(id))) {
    if (typeof (id) === 'object') {
      id = _.get(id, 'entityInstancePk.entityInstanceId');
    } else {
      id = _.get(JSON.parse(id), 'entityInstancePk.entityInstanceId');
    }
  }
  logger.info(`[deleteItem] Delete entity with id = ${id}, model = ${model}`);
  logger.debug(`[deleteItem] Finding entity locations for ${model}`);
  try {
    logger.debug('[deleteItem] Deleting entity!!');

    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/deleteEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: [{
          entityName: model,
          entityInstanceId: Number(id)
        }]
      }
    });
    logger.debug('[deleteItem] Responce is:');
    logger.debug(result);
    return res.status(httpStatus.NO_CONTENT).end();
  } catch (err) {
    logger.error('[deleteItem] Axios error');
    logger.error(err.message);
    return handler(err, req, res);
  }
};
