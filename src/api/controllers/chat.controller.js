const httpStatus = require('http-status');
const moment = require('moment');
const { handler, badRequest } = require('../middlewares/error');
const { EDFAssert } = require('../utils/Assert');
const _ = require('lodash');
const EDF = require('../../config/EDF');
const logger = require('../utils/Logger')(module);


const chatEntityName = 'CHAT_Переписка';
const protoMessageEntityName = 'CHAT_протосообщение';
const messageEntityName = 'CHAT_сообщение';
const createMessageProcessName = 'WCM - Откликнуться';

exports.chatList = async (req, res) => {
  const user = req.user || {};
  const userPublicId = user.userId;
  logger.info('[chatList] Getting chat list');
  logger.info({
    entityName: chatEntityName,
    query: `[Автор userId] = '${userPublicId}'`,
    orderBy: ''
  });
  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        searchParams: {
          entityName: chatEntityName,
          query: `[Автор userId] = '${userPublicId}'`,
          orderBy: ''
        },
        paging: {
          pageNumber: 1,
          pageSize: 1000
        }
      }
    });

    const response = _.get(result, 'data');

    logger.info('[chatList] Chat list data:');
    logger.info(response);

    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error('[chatList] Error getting chat list data!');
    logger.error(err.message);
    logger.error({
      entityName: chatEntityName,
      query: `[Автор userId] = '${userPublicId}'`,
      orderBy: ''
    });
    return handler(err, req, res);
  }
};

exports.messageList = async (req, res) => {
  const { chatId } = req.body;
  logger.info(`[messageList] Getting messages list for chat '${chatId}'`);

  if (!chatId) {
    logger.error('[message] Bad request: parameter \'chatId\' required!');
    return badRequest('parameter \'chatId\' required!', req, res);
  }

  try {
    const result = await Promise.all([EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        searchParams: {
          entityName: messageEntityName,
          query: `[Код переписки] = '${chatId}'`,
          orderBy: ''
        },
        paging: {
          pageNumber: 1,
          pageSize: 1000
        }
      }
    }),
    EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        searchParams: {
          entityName: chatEntityName,
          query: `[Код переписки] = '${chatId}'`,
          orderBy: ''
        },
        paging: {
          pageNumber: 1,
          pageSize: 1
        }
      }
    })]);

    const response = _.get(result[0], 'data');
    const chatEntityId = _.get(result[1], 'data.rows[0].entityInstancePk.entityInstanceId');
    const chatEntityFields = _.get(result[1], 'data.rows[0].object');

    logger.info('[chatList] Message list data:');
    logger.info(response);
    logger.info(`[chatList] Chat id = ${chatEntityId} data:`);
    logger.info(chatEntityFields);

    chatEntityFields['Новых сообщений'] = 0;

    let project;
    if (chatEntityFields['Проект'] && (typeof chatEntityFields['Проект'] === 'object')) {
      project = _.get(chatEntityFields['Проект'], 'entityInstancePk.entityInstanceId');
    } else if (chatEntityFields['Проект']) {
      project = Number(chatEntityFields['Проект']);
    }
    chatEntityFields['Проект'] = project;

    logger.debug('[chatList] Updating chat fields:');
    const saveRes = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/updateEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstances: [{
          entityInstancePk: {
            entityName: chatEntityName,
            entityInstanceId: Number(chatEntityId)
          },
          object: chatEntityFields
        }]
      }
    });
    logger.debug('[chatList] Saving status:');
    logger.debug(saveRes);
    res.status(httpStatus.OK);
    return res.json(response).end();
  } catch (err) {
    logger.error('[chatList] Error getting message list data!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.sendMessage = async (req, res) => {
  const {
    chatId,
    profileId,
    projectId,
    file,
    message,
    link
  } = req.body;
  const userPublicId = req.user.userId;
  const now = moment().format();
  const entityName = protoMessageEntityName;
  logger.info('[createMessage] Creating new message');
  logger.info(req.body);
  logger.debug([
    chatId,
    profileId,
    projectId,
    file,
    message,
    link
  ]);
  try {
    logger.debug(`[createMessage] Finding '${createMessageProcessName}' process id!`);
    const actionIdRes = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        searchParams: {
          entityName: 'EDF_PoolModel',
          query: '',
          orderBy: ''
        },
        paging: {
          pageNumber: 1,
          pageSize: 100
        }
      }
    });
    const actionList = _.get(actionIdRes, 'data.rows');
    const processPk = _.get(_.find(actionList, { object: { name: createMessageProcessName } }), 'object.startEventPk.entityInstancePk.entityInstanceId');
    logger.debug(`[createMessage] '${createMessageProcessName} process id = ${processPk}'`);

    logger.info(`[createMessage] Starting process id = ${processPk}`);
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
    logger.info(`[createMessage] Process started, processStepId = ${processStepId}. Getting processStep instance...`);

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
    logger.info(`[createMessage] Step getted! adapterTaskId = ${adapterTaskId}, activityTypeId = ${activityTypeId}, stepProcessPk = ${stepProcessPk}. Getting OutEntityId...`);
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
    logger.info(`[createMessage] outEntityInstanceId = ${outEntityInstanceId}. Saving data for model ${entityName}...`);
    logger.info(_.get(outEntityIdRes, 'data'));
    let project;
    if (projectId && (typeof projectId === 'object')) {
      project = _.get(projectId, 'entityInstancePk.entityInstanceId');
    } else if (projectId) {
      project = Number(projectId);
    }
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
          object: {
            a_sub_userId: userPublicId,
            b_sub_profileId: profileId,
            Проект: project,
            DT: now,
            Вложение: file,
            'Код переписки': chatId,
            'Внутренняя ссылка': link,
            Сообщение: message
          }
        }]
      }
    });

    logger.info('[createMessage] Entity saved! Terminating step...');
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
    logger.info('[createMessage] Notify task done response is:');
    logger.info(doneResult);
    logger.debug('[createMessage] ***********************    MonoStep successfully terminated!!!!    **************************');

    return res.status(httpStatus.NO_CONTENT).end();
  } catch (err) {
    logger.error('[createMessage] Error creating message!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

