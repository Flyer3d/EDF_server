const httpStatus = require('http-status');
const { handler, notFound } = require('../../middlewares/error');
const { EDFAssert } = require('../../utils/Assert');
const _ = require('lodash');
const EDF = require('../../../config/EDF');
const logger = require('../../utils/Logger')(module);

exports.getList = async (req, res) => {
  const { query } = req;
  logger.info('[getList] Getting Step list with params:');
  logger.info(query);
  logger.debug('[getList] getting entity instances for EDF_ProcessStep');
  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        searchParams: {
          entityName: 'EDF_ProcessStep',
          query: "endTime is null AND activityTypeId='web'",
          orderBy: query.orderBy || ''
        },
        paging: {
          pageNumber: query.pageNumber || 1,
          pageSize: query.pageSize || 999
        }
      }
    });
    const response = _.get(result, 'data');
    logger.debug(`[getList] Recived response. Length is: ${_.get(response, 'rows.length')}`);
    response.rows = response.rows.map((item) => {
      const resItem = item;
      if (typeof item.object.processPk === 'object') {
        // ToDo: Костыль! Убрать!!!
        resItem.object.processPk = _.get(item, 'object.processPk.entityInstancePk.entityInstanceId');
      }
      return resItem;
    });
    const processIds = _.get(response, 'rows', []).map(item => item.object.processPk) || [];
    const activityIds = _.get(response, 'rows', []).map(item => item.object.flowNodePk) || [];

    logger.debug(`[getList] Process Ids (${processIds.length})`);
    logger.debug(processIds);
    logger.debug(`[getList] Activity Ids (${activityIds.length})`);
    logger.debug(activityIds);

    if (_.get(response, 'rows.length') < 1) {
      res.status(httpStatus.OK);
      return res.json(response).end();
    }

    logger.debug('[getList] Getting EDF_Process...');
    const process = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: processIds.map(item => ({
          entityName: 'EDF_Process',
          entityInstanceId: Number(item)
        }))
      }
    });
    logger.debug('[getList] Processes recived! Getting EDF_PoolModel...');
    const poolModelIds = _.get(process, 'data.rows', []).map((item) => {
      if (typeof (item.object.poolPk) === 'object') {
        return _.get(item, 'object.poolPk.entityInstancePk.entityInstanceId');
      }
      return item.object.poolPk;
    });
    logger.debug(poolModelIds);
    const pools = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: poolModelIds.map(item => ({
          entityName: 'EDF_PoolModel',
          entityInstanceId: Number(item)
        }))
      }
    });
    logger.debug('[getList] Pools recived! Getting EDF_ActivityModel...');
    _.get(pools, 'data.rows', []).forEach((item, i) => {
      response.rows[i].object.name = item.object.name;
    });

    // ************************ Step name ********************************

    const activity = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: activityIds.map(item => ({
          entityName: 'EDF_ActivityModel',
          entityInstanceId: Number(item)
        }))
      }
    });
    logger.debug('[getList] Activity recived!');
    _.get(activity, 'data.rows', []).forEach((item, i) => {
      response.rows[i].object.stepName = item.object.name;
    });

    // ************************ Step Role ********************************

    const laneModelIds = _.get(activity, 'data.rows', []).map(item => _.get(item, 'object.lanePk.entityInstancePk.entityInstanceId'));

    const lane = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: laneModelIds.map(item => ({
          entityName: 'EDF_LaneModel',
          entityInstanceId: Number(item)
        }))
      }
    });
    logger.debug('[getList] Lane recived!');
    _.get(lane, 'data.rows', []).forEach((item, i) => {
      response.rows[i].object.role = item.object.name;
    });
    const userRoles = (req.user && req.user.roles) || [];
    if (userRoles.indexOf('admin') !== -1 || userRoles.indexOf('web_admin') !== -1) {
      logger.info('[getList] Successfully getting Steps list');
      logger.debug(response);
      res.status(httpStatus.OK);
      return res.json(response).end();
    }
    logger.info('[getList] Successfully getting Steps list');
    logger.debug(response);
    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error('[getList] Error getting step list data!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.getData = async (req, model, modelId, res) => {
  let id = modelId;
  if (Number.isNaN(Number(id))) {
    if (typeof (id) === 'object') {
      id = _.get(id, 'entityInstancePk.entityInstanceId');
    } else {
      id = _.get(JSON.parse(id), 'entityInstancePk.entityInstanceId');
    }
  }
  logger.info(`[getData] Getting Step DATA for model = ${model} and id = ${id}!`);

  try {
    logger.debig('[getData] Getting entity instance');
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
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

    const response = _.get(result, 'data');
    logger.info(`[getData] Successfully getting data for model = ${model} id = ${id}`);
    logger.info(response);
    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error(`[getData] Error getting data for model - ${model} id = ${id}`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.saveData = async (req, res) => {
  // ToDo: Зачем .data??
  const {
    id,
    model,
    fields
  } = req.body.data;
  logger.info(`[saveData] Saving data for id = ${id}, model = ${model}`);
  logger.info(fields);
  try {
    logger.debug('[saveData] Updating fields:');
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

    logger.debug('[saveData] Responce is:');
    logger.debug(result);

    const response = _.get(result, 'data');
    logger.info('[saveData] Successfully updating data!');
    logger.info(response);
    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error(`Axios error load ${EDF.data.coreEndpoint}/startEvent`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.submitStep = async (req, activityTypeId, adapterTaskId, res) => {
  logger.info(`[submitStep] Submitting on adapter ${adapterTaskId}, activity ${activityTypeId}`);
  try {
    const doneResult = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/notifyTaskDone`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        authContext: {
          login: (req.user && req.user.username) || 'anonymous',
          superUser: true
        },
        adapterTaskPk: {
          id: adapterTaskId,
          activityId: activityTypeId
        },
        status: {
          type: 'SUCCESS'
        }
      }
    });
    logger.info('[submitStep] Notify task done response is:');
    logger.info(doneResult);
    logger.debug('[submitStep] ***********************    Step successfully terminated!!!!    **************************');

    return res.status(httpStatus.NO_CONTENT).end();
  } catch (err) {
    logger.error(`Axios error ${EDF.data.coreEndpoint}/notifyTaskDone`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.submitMonoStep = async (req, res) => {
  const {
    fields,
    processId,
    processName,
    entityName
  } = req.body;
  let processPk = processId;
  if (processId) {
    if (Number.isNaN(Number(processPk))) {
      processPk = _.get(JSON.parse(processPk), 'entityInstancePk.entityInstanceId');
    } else {
      processPk = processId;
    }
  } else if (processName) {
    try {
      const processSrc = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          searchParams: {
            entityName: 'EDF_PoolModel',
            query: `name=${processName}'`
          },
          paging: {
            pageNumber: 1,
            pageSize: 999
          }
        }
      });
      const processArr = _.get(processSrc, 'data.rows', []);
      if (processArr.length === 0) {
        logger.error(`Process with name ${processName} not found`);
        return notFound(req, res);
      } else if (processArr.length === 1) {
        processPk = _.get(processArr[0], 'object.startEventPk.entityInstancePk.entityInstanceId');
      } else {
        const process = _.find(processArr, { object: { name: processName } });
        if (process) {
          processPk = _.get(process, 'object.startEventPk.entityInstancePk.entityInstanceId');
        } else {
          logger.error(`Process with name ${processName} not found`);
          return notFound(req, res);
        }
      }
    } catch (err) {
      logger.error(`Axios error ${EDF.data.coreEndpoint}/searchEntityInstances`);
      logger.error(err.message);
      return handler(err, req, res);
    }
  }
  logger.info(`[submitMonoStep] Submitting for process ${processPk}::${processName} with entity ${entityName}:`);
  logger.info(fields);
  try {
    logger.info(`[submitMonoStep] Starting process id = ${processPk}`);
    const startEventRes = await EDFAssert({
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
          id: Number(processPk)
        }
      }
    });
    logger.info(startEventRes.data);
    const processStepId = _.get(startEventRes, 'data.newProcessStepPk.id');
    logger.info(`[submitMonoStep] Process started, processStepId = ${processStepId}. Getting processStep instance...`);

    const processStepRes = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: [{
          entityName: 'EDF_ProcessStep',
          entityInstanceId: processStepId
        }]
      }
    });

    const adapterTaskId = _.get(processStepRes, 'data.rows[0].object.adapterTaskId');
    const activityTypeId = _.get(processStepRes, 'data.rows[0].object.activityTypeId');
    const stepProcessPk = _.get(processStepRes, 'data.rows[0].object.processPk.entityInstancePk.entityInstanceId');
    logger.info(`[submitMonoStep] Step getted! adapterTaskId = ${adapterTaskId}, activityTypeId = ${activityTypeId}, stepProcessPk = ${stepProcessPk}. Getting OutEntityId...`);
    const outEntityIdRes = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        searchParams: {
          entityName: 'EDF_ProcessEntityInstance',
          query: `processPk=${stepProcessPk} AND entityName='${entityName}'`
        },
        paging: {
          pageNumber: 1,
          pageSize: 999
        }
      }
    });

    const outEntityInstanceId = _.get(outEntityIdRes, 'data.rows[0].object.entityInstanceId');
    logger.info(`[submitMonoStep] outEntityInstanceId = ${outEntityInstanceId}. Saving data for model ${entityName}...`);
    logger.info(_.get(outEntityIdRes, 'data'));

    const saveEntityRes = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/updateEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstances: [{
          entityInstancePk: {
            entityName,
            entityInstanceId: Number(outEntityInstanceId)
          },
          object: fields
        }]
      }
    });

    logger.info('[submitMonoStep] Entity saved! Terminating step...');
    logger.info(_.get(saveEntityRes, 'data.rows[0]'));

    const doneResult = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/notifyTaskDone`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        authContext: {
          login: (req.user && req.user.username) || 'anonymous',
          superUser: true
        },
        adapterTaskPk: {
          id: adapterTaskId,
          activityId: activityTypeId
        },
        status: {
          type: 'SUCCESS'
        }
      }
    });
    logger.info('[submitMonoStep] Notify task done response is:');
    logger.info(doneResult);
    logger.debug('[submitMonoStep] ***********************    MonoStep successfully terminated!!!!    **************************');

    return res.status(httpStatus.NO_CONTENT).end();
  } catch (err) {
    logger.error(`Axios error ${EDF.data.coreEndpoint}/notifyTaskDone`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};
