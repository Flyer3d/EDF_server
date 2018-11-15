const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const EDFAssert = require('../api/utils/Assert');
const { edf } = require('./vars');
const logger = require('../api/utils/Logger')(module);

const data = {
  entityModelNames: [],
  lists: {},
  coreEndpoint: edf.uri,
  layoutModelName: edf.layoutModelName,
  widgetModelName: edf.widgetModelName,
  blockModelName: edf.blockModelName,
  desktopModelName: edf.desktopModelName,
  defaultAccessToken: null,
  headers: {},
  status: 'INITIAL'
};

let savedEntityRows = null;
let fillingInPrigress = false;
const maxInstances = 100;

const fillEntityModelNames = async () => {
  logger.info('[fillEntityModelNames] Starting!..');
  if (fillingInPrigress) {
    logger.info('[fillEntityModelNames] Filling in progress yet!... return true');
    return true;
  }

  logger.info('[fillEntityModelNames] Filling Entity names array!');
  let rawEntityModels;
  try {
    rawEntityModels = await EDFAssert.EDFAssert({
      url: `${edf.uri}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: data.headers,
      data: {
        searchParams: {
          entityName: 'EDF_EntityModel',
          query: ''
        },
        paging: {
          pageNumber: 1,
          pageSize: 1
        }
      }
    });
  } catch (err) {
    fillingInPrigress = false;
    logger.error('[fillEntityModelNames] Error getting entity instances!');
    logger.error(err.message);
    return false;
  }
  const entityRows = _.get(rawEntityModels, 'data.paging.totalRows');
  if (entityRows === savedEntityRows && data.entityModelNames.length > 0) {
    logger.info(`[fillEntityModelNames] No dada changed (total ${entityRows} entities)! Returning...`);
    fillingInPrigress = false;
    return true;
  }
  logger.info('[fillEntityModelNames] Data changes! Refilling!!!');
  savedEntityRows = entityRows;
  fillingInPrigress = true;
  const totalPages = Math.ceil(entityRows / maxInstances);
  const indexArray = [];
  for (let i = 0; i < totalPages; i += 1) {
    indexArray.push(i + 1);
  }

  try {
    logger.info(`[fillEntityModelNames] Mapping all promises! (total ${entityRows} entities)`);
    const resultArray = await Promise.all(indexArray.map(async (index) => {
      const result = await EDFAssert.EDFAssert({
        url: `${edf.uri}/searchEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: data.headers,
        data: {
          searchParams: {
            entityName: 'EDF_EntityModel',
            query: ''
          },
          paging: {
            pageNumber: index,
            pageSize: maxInstances
          }
        }
      });
      return _.uniq(_.map(_.get(result, 'data.rows', []), item => (item.object && item.object.name))) || [];
    }));
    logger.debug(`[fillEntityModelNames] All Entities loaded! Total ${resultArray.length} rows!`);

    const entityModelNames = _.uniq(_.flatten(resultArray));
    logger.info(`[fillEntityModelNames] EntityNameArray filled! (total ${entityModelNames.length} entities!)`);
    logger.info(entityModelNames);
    data.entityModelNames = entityModelNames || [];
    fillingInPrigress = false;
    return true;
  } catch (err) {
    fillingInPrigress = false;
    logger.error('[fillEntityModelNames] Error getting entity instances!');
    logger.error(err.message);
    return false;
  }
};

/**
 * Connect to EDF API
 *
 * @returns {string} Session ID
 * @public
 */
const connect = async () => {
  data.status = 'CONNECTING';
  logger.info('[connect] Connecting to EDF...');
  logger.debug('[connect] Trying to get default access token!');
  logger.debug({
    url: `${edf.uri}/authentication/v1/getToken`,
    method: 'post',
    responseType: 'json',
    data: {
      client_id: edf.defaultUser,
      client_secret: edf.defaultPassword,
      grant_type: 'authorization_code'
    }
  });
  let defaultLoginRes;
  try {
    defaultLoginRes = await axios({
      url: `${edf.uri}/authentication/v1/getToken`,
      method: 'post',
      responseType: 'json',
      data: {
        client_id: edf.defaultUser,
        client_secret: edf.defaultPassword,
        grant_type: 'authorization_code'
      }
    });
  } catch (err) {
    if (err.status === 401) {
      logger.error(`[connect] User ${edf.defaultUser} not found`);
      logger.error(err.message);
      data.status = 'ERROR';
      return false;
    }
    logger.error(`[connect] Authorization error status = ${err.status}`);
    logger.error(err.message);
    data.status = 'ERROR';
    return false;
  }
  data.defaultAccessToken = `${defaultLoginRes.data.token_type} ${defaultLoginRes.data.access_token}`;
  data.headers = {
    Authorization: data.defaultAccessToken
  };
  logger.debug('[connect] Access token received!!');
  logger.debug(data.headers);
  data.status = 'SUCCESS';
  return true;
};

const loadLists = async () => {
  logger.info('[loadLists] Loading data for lists...');
  const listsPath = path.join(__dirname, edf.listsPath);
  try {
    await fs.ensureDir(listsPath);
    logger.debug(`Directory ${listsPath} exists! Getting dirlist...`);
    try {
      const items = await fs.readdir(listsPath);
      logger.debug('Directory list getted:');
      logger.debug(items);
      await Promise.all(items.map(async (dir) => {
        logger.debug(`Subdir is: ${dir}`);
        data.lists[dir] = {};
        const filesPath = path.join(listsPath, dir);
        try {
          const files = await fs.readdir(filesPath);
          logger.debug(`Files for dir ${dir} is:`);
          logger.debug(files);

          await Promise.all(files.map(async (file) => {
            const filePath = path.join(filesPath, file);
            try {
              data.lists[dir][file] = [];
              const fileData = fs.readFileSync(filePath);
              logger.debug(`File ${filePath} successfully loaded!`);
              data.lists[dir][file] = _.compact(fileData.toString().split('\n'));
            } catch (err) {
              logger.error(`Error reading file: ${filePath}`);
              logger.error(err.message);
            }
          }));
        } catch (err) {
          logger.error(`Error reading file list in path: ${filesPath}`);
          logger.error(err.message);
        }
      }));
    } catch (err) {
      logger.error(`Error reading directiry ${listsPath}`);
      logger.error(err.message);
    }
  } catch (err) {
    logger.error(`Error accessing directiry ${listsPath}`);
    logger.error(err.message);
  }
  logger.info('[loadLists] All lists loaded!');
};

const init = async (callback) => {
  await connect();
  await loadLists();
  await fillEntityModelNames();
  callback();
};

exports.data = data;
exports.fillEntityModelNames = fillEntityModelNames;
exports.connect = connect;
exports.init = init;

