const httpStatus = require('http-status');
const logger = require('../utils/Logger')(module);
const _ = require('lodash');
const EDF = require('../../config/EDF');
const { handler, notFound } = require('../middlewares/error');
const { EDFAssert } = require('../utils/Assert');

exports.suggest = async (req, res) => {
  const { query } = req;
  logger.info('[suggest] With query:');
  logger.info(query.q);
  // Getting all models!

  try {
    await EDF.fillEntityModelNames();
  } catch (err) {
    logger.error('[suggest] Error filling EntityModelNames!');
    logger.error(err.message);
    return handler(err, req, res);
  }

  const entityNames = EDF.data.entityModelNames;
  logger.info(`[suggest] EntityNames getted! Total ${entityNames.length} entities!`);
  logger.info(entityNames);
  const entityModels = entityNames.map((item) => {
    let type;
    switch (item) {
      case 'EDF_PoolModel':
        type = 'ACTION';
        break;
      case 'EDF_ProcessStep':
        type = 'STEP';
        break;
      case 'SUPP_Новость':
        type = 'NEWS';
        break;
      case 'BAAS_Price':
        type = 'PRICE';
        break;
      case 'WEB_HTML':
        type = 'HTML';
        break;
      default:
        type = 'MODEL';
    }
    return {
      name: item,
      title: item,
      type
    };
  });
  if (!query.q) {
    res.status(httpStatus.OK);
    logger.info('[suggest] Returning full list');
    return res.json(entityModels).end();
  }
  const str = query.q.toLowerCase();
  const resModels = entityModels
    .filter((model, index) => {
      try {
        const found = (model.name.toLowerCase().indexOf(str) !== -1);
        return found;
      } catch (err) {
        logger.error(`[model] Error in Models arr @index ${index}!!!`);
        logger.error(err);
        return false;
      }
    }) || [];
  logger.info('[suggest] Returning filtered list');
  res.status(httpStatus.OK);
  return res.json(resModels).end();
};

exports.model = async (req, res) => {
  const { query } = req;
  logger.info(`[model] Getting "${query.model}" model`);
  let entity;
  try {
    entity = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/getEntityDescriptions`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        authContext: {
          login: (req.user && req.user.username) || 'anonymous',
          isSuperUser: (req.user && req.user.role === 'admin') || false
        },
        entityPks: [
          {
            name: query.model
          }
        ]
      }
    });
  } catch (err) {
    logger.error(`[model] error getting "${query.model}" model`);
    logger.error(err.message);
    return handler(err, req, res);
  }
  const model = _.get(entity, 'data.rows[0]');
  try {
    if (EDF.data.lists[query.model]) {
      logger.debug(`[model] Model ${query.model} in lists!`);
      const listModel = EDF.data.lists[query.model];
      for (const fieldName in listModel) {
        const fieldIndex = _.findIndex(model.fields, { name: fieldName });
        if (fieldIndex !== -1) {
          if (model.fields[fieldIndex].tags) {
            model.fields[fieldIndex].tags.isListField = true;
          } else {
            model.fields[fieldIndex].tags = { isListField: true };
          }
        }
      }
    }
  } catch (err) {
    logger.error(err.message);
  }
  logger.info(`[model] successefully recived description for ${query.model}`);
  logger.info(model);
  res.json(model);
  return res.status(httpStatus.OK).end();
};


exports.stepModel = async (req, res) => {
  const { stepId, processId, flowNodeId } = req.query;
  let processPk = processId;
  if (Number.isNaN(Number(processId))) {
    processPk = _.get(JSON.parse(processId), 'entityInstancePk.entityInstanceId');
  }
  logger.info(`[stepModel] Requesting Step model. stepId = ${stepId}, processId = ${processId} type = ${typeof (processId)},processPk = ${processPk}, flowNodeId = ${flowNodeId}`);
  try {
    logger.debug('[stepModel] Getting Activity model...');
    const activityModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: [
          {
            entityName: 'EDF_ActivityModel',
            entityInstanceId: Number(flowNodeId)
          }
        ]
      }
    });
    logger.debug('[stepModel] Getting Process model...');
    const processModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: [
          {
            entityName: 'EDF_Process',
            entityInstanceId: Number(processPk)
          }
        ]
      }
    });
    const poolModelId = _.get(processModel, 'data.rows[0].object.poolPk.entityInstancePk.entityInstanceId');
    logger.debug(`[stepModel] PoolModelId = ${poolModelId}. Getting PoolModel...`);
    const poolModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: [
          {
            entityName: 'EDF_PoolModel',
            entityInstanceId: Number(poolModelId)
          }
        ]
      }
    });

    const activityDocumentation = _.get(activityModel, 'data.rows[0].object.documentation', []);
    const activityModelName = _.get(activityModel, 'data.rows[0].object.name');
    const activityModelId = _.get(activityModel, 'data.rows[0].object.pk');
    const poolModelName = _.get(poolModel, 'data.rows[0].object.name');

    logger.debug(`[stepModel] Activity model name = "${activityModelName}", and ID is: = ${activityModelId}`);
    logger.debug(`[stepModel] Pool model name = "${poolModelName}", and ID is: ${poolModelId}`);
    logger.debug('[stepModel] AtivityModel documentation is:');
    logger.debug(activityDocumentation);
    logger.debug('[stepModel] Getting Activity(In/Out)Model...');

    const activityEntityOutModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        searchParams: {
          entityName: 'EDF_ActivityEntityOutModel',
          query: `activityPk=${activityModelId}`
        },
        paging: {
          pageNumber: 1,
          pageSize: 999
        }
      }
    });
    const activityEntityInModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        searchParams: {
          entityName: 'EDF_ActivityEntityInModel',
          query: `activityPk=${activityModelId}`
        },
        paging: {
          pageNumber: 1,
          pageSize: 999
        }
      }
    });

    logger.debug('[stepModel] In/Our models resived! EntityModelNames:');
    logger.debug(_.get(activityEntityInModel, 'data.rows'));
    logger.debug(_.get(activityEntityOutModel, 'data.rows'));

    const inEntityModelName = _.get(activityEntityInModel, 'data.rows', []);
    const outEntityModelName = _.get(activityEntityOutModel, 'data.rows', []);

    logger.debug('[stepModel] Getting activityEntity(In/Out)ModelId!!!');
    let activityEntityInModelId;
    let activityEntityOutModelId;
    if (inEntityModelName.length > 0) {
      activityEntityInModelId = await Promise.all(inEntityModelName.map(item => EDFAssert({
        url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          searchParams: {
            entityName: 'EDF_ProcessEntityInstance',
            query: `processPk=${processPk} AND entityName='${item.object.entityName}'`
          },
          paging: {
            pageNumber: 1,
            pageSize: 999
          }
        }
      })));
    }
    if (outEntityModelName.length > 0) {
      activityEntityOutModelId = await Promise.all(outEntityModelName.map(item => EDFAssert({
        url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          searchParams: {
            entityName: 'EDF_ProcessEntityInstance',
            query: `processPk=${processPk} AND entityName='${item.object.entityName}'`
          },
          paging: {
            pageNumber: 1,
            pageSize: 999
          }
        }
      })));
    }
    let inEntityInstanceId;
    if (activityEntityInModelId && activityEntityInModelId.length > 0) {
      logger.debug('[stepModel] activityEntityInModelId is not empty!!!');

      // ToDo: Проверка статуса каждой записи!
      inEntityInstanceId = activityEntityInModelId.map((item) => {
        logger.debug(_.get(item, 'data.rows'));
        return _.get(item, 'data.rows[0].object.entityInstanceId');
      });
    }
    let outEntityInstanceId;
    if (activityEntityOutModelId && activityEntityOutModelId.length > 0) {
      // ToDo: Проверка статуса каждой записи!
      outEntityInstanceId = activityEntityOutModelId.map((item) => {
        logger.debug('[stepModel] activityEntityOutModelId is not empty!!!');
        logger.debug(_.get(item, 'data.rows'));
        return _.get(item, 'data.rows[0].object.entityInstanceId');
      });
    }

    const inEntityModels = inEntityModelName.map((item, i) => {
      const name = _.get(item, 'object.entityName');
      return {
        modelName: name,
        instanceId: inEntityInstanceId && inEntityInstanceId[i]
      };
    });
    const outEntityModels = outEntityModelName.map((item, i) => {
      const name = _.get(item, 'object.entityName');
      return {
        modelName: name,
        instanceId: outEntityInstanceId && outEntityInstanceId[i]
      };
    });

    const stepModel = {
      flowNodeId,
      activityModelName,
      stepId,
      processId: processPk,
      poolModelId,
      poolModelName,
      activityDocumentation,
      inEntityModels,
      outEntityModels
    };

    logger.info('[stepModel] Result model is:');
    logger.info(stepModel);
    res.status(httpStatus.OK);
    return res.json(stepModel).end();
  } catch (err) {
    logger.error('[stepModel] Error getting description!!!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.stepModelByEventPk = async (req, res) => {
  const { startEventPk } = req.body;

  let startEventId = startEventPk;
  if (Number.isNaN(Number(startEventId))) {
    startEventId = _.get(JSON.parse(startEventId), 'entityInstancePk.entityInstanceId');
  }

  logger.info(`[stepModelByEventPk] Requesting Step model for first step using startEventId = ${startEventId}`);
  try {
    logger.debug('[stepModelByEventPk] Finding corresponding SequenseFlowModel...');
    const sequenceFlowModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        searchParams: {
          entityName: 'EDF_SequenceFlowModel',
          query: `[sourceRef]='${startEventId}'`,
          orderBy: ''
        },
        paging: {
          pageNumber: 1,
          pageSize: 1
        }
      }
    });
    const aktivityModelPk = _.get(sequenceFlowModel, 'data.rows[0].object.targetRef');
    logger.debug(`[stepModelByEventPk] Getting Activity model by id = ${aktivityModelPk}...`);
    const activityModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/readEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: [
          {
            entityName: 'EDF_ActivityModel',
            entityInstanceId: Number(aktivityModelPk)
          }
        ]
      }
    });

    if (_.isEmpty(_.get(activityModel, 'data.rows[0].object', {}))) {
      logger.error(`[stepModelByEventPk] Not found corresponding Activity Model (${aktivityModelPk})`);
      return notFound(req, res);
    }

    const activityDocumentation = _.get(activityModel, 'data.rows[0].object.documentation', []);
    const activityModelName = _.get(activityModel, 'data.rows[0].object.name');
    const activityModelId = _.get(activityModel, 'data.rows[0].object.pk');


    logger.debug(`[stepModelByEventPk] Activity model name = "${activityModelName}", and ID is: = ${activityModelId}`);
    logger.debug(_.get(activityModel, 'data.rows[0].object'));
    logger.debug('[stepModelByEventPk] AtivityModel documentation is:');
    logger.debug(activityDocumentation);
    logger.debug('[stepModelByEventPk] Getting Activity(In/Out)Model...');

    const activityEntityOutModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        searchParams: {
          entityName: 'EDF_ActivityEntityOutModel',
          query: `activityModelId=${activityModelId}`
        },
        paging: {
          pageNumber: 1,
          pageSize: 999
        }
      }
    });

    logger.debug('[stepModelByEventPk] In/Our models resived! EntityModelNames:');
    logger.debug(_.get(activityEntityOutModel, 'data.rows'));
    const outEntityModelName = _.get(activityEntityOutModel, 'data.rows[0].object.entityName', '');
    let entity;
    try {
      entity = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/getEntityDescriptions`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          authContext: {
            login: (req.user && req.user.username) || 'anonymous',
            isSuperUser: (req.user && req.user.role === 'admin') || false
          },
          entityPks: [
            {
              name: outEntityModelName
            }
          ]
        }
      });
    } catch (err) {
      logger.error(`[stepModelByEventPk] error getting "${outEntityModelName}" model`);
      logger.error(err.message);
      return handler(err, req, res);
    }
    const model = _.get(entity, 'data.rows[0]');
    logger.info('[stepModelByEventPk] Result model is:');
    logger.info(model);
    res.status(httpStatus.OK);
    return res.json(model).end();
  } catch (err) {
    logger.error('[stepModelByEventPk] Error getting description!!!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.stepListModel = async (req, res) => {
  logger.info('[stepListModel] Getting Step List model!');
  try {
    const psModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/getEntityDescriptions`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        authContext: {
          login: (req.user && req.user.username) || 'anonymous',
          isSuperUser: (req.user && req.user.role === 'admin') || false
        },
        entityPks: [
          {
            name: 'EDF_ProcessStep'
          }
        ]
      }
    });
    const pmModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/getEntityDescriptions`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        authContext: {
          login: (req.user && req.user.username) || 'anonymous',
          isSuperUser: (req.user && req.user.role === 'admin') || false
        },
        entityPks: [
          {
            name: 'EDF_PoolModel'
          }
        ]
      }
    });
    const amModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/getEntityDescriptions`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        authContext: {
          login: (req.user && req.user.username) || 'anonymous',
          isSuperUser: (req.user && req.user.role === 'admin') || false
        },
        entityPks: [
          {
            name: 'EDF_ActivityModel'
          }
        ]
      }
    });
    const lmModel = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/getEntityDescriptions`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        authContext: {
          login: (req.user && req.user.username) || 'anonymous',
          isSuperUser: (req.user && req.user.role === 'admin') || false
        },
        entityPks: [
          {
            name: 'EDF_LaneModel'
          }
        ]
      }
    });

    logger.debug('[stepListModel] ProcessStep is:');
    logger.debug(_.get(psModel, 'data.rows[0]'));
    logger.debug('[stepListModel] PoolModel is:');
    logger.debug(_.get(pmModel, 'data.rows[0]'));
    logger.debug('[stepListModel] ActivityModel is:');
    logger.debug(_.get(amModel, 'data.rows[0]'));
    logger.debug('[stepListModel] LaneModel is:');
    logger.debug(_.get(lmModel, 'data.rows[0]'));

    const pmModelFields = _.get(pmModel, 'data.rows[0].fields');
    const pmNameField = pmModelFields && pmModelFields.find(item => item.name === 'name');
    const amModelFields = _.get(amModel, 'data.rows[0].fields');
    const amNameField = amModelFields && amModelFields.find(item => item.name === 'name');
    const lmModelFields = _.get(lmModel, 'data.rows[0].fields');
    const lmNameField = lmModelFields && lmModelFields.find(item => item.name === 'name');
    amNameField.name = 'stepName';
    lmNameField.name = 'role';
    const processStep = _.get(psModel, 'data.rows[0]');

    pmNameField.order = processStep.fields.length + 1;
    amNameField.order = processStep.fields.length + 2;
    lmNameField.order = processStep.fields.length + 3;
    processStep.fields.push(pmNameField);
    processStep.fields.push(amNameField);
    processStep.fields.push(lmNameField);

    logger.info('[stepListModel] Stem list model is:');
    logger.info(processStep);
    res.status(httpStatus.OK);
    return res.json(processStep).end();
  } catch (err) {
    logger.error('[stepListModel] Error getting description!!!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

