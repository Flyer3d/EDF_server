const axios = require('axios');
const httpStatus = require('http-status');
const APIError = require('./APIError');
const _ = require('lodash');
const { data: EDF, connect } = require('../../config/EDF');
const logger = require('../utils/Logger')(module);

// const { performance } = require('perf_hooks');

exports.EDFAssert = async (input) => {
  const object = Object.assign({}, input);
  // const time = performance.now();
  // let time1, time2, time3;
  let result;
  logger.info(`[EDFAssert] Trying to ${object.method}@${object.url}.`);
  object.headers.Authorization = object.headers.Authorization || EDF.defaultAccessToken;
  if (object.url && (object.url.indexOf('putFile') === -1)) {
    logger.info(object);
  }
  try {
    // time1 = performance.now() - time;
    result = await axios(object);
    // time2 = performance.now() - time;
  } catch (error) {
    logger.error(`NOT SUCCESS!!! status = ${error.code}`);
    logger.error(error.message);
    if (error.response.status === 400) {
      logger.info('[EDFAssert] Bad access token! Reconnecting..... ');
      try {
        await connect();
        logger.info(`[EDFAssert] Reconnected!!! Trying again to ${object.method}@${object.url}.`);
        logger.info(object.data);
        result = await axios(object);
        logger.info('[EDFAssert] Result recived!!!');
      } catch (err) {
        logger.error('[EDFAssert] Error in axios!');
        logger.error(err.message);
        throw new APIError({
          message: err.message,
          status: err.status || (err.response && err.response.status),
          stack: err.stack
        });
      }
    } else {
      logger.error('[EDFAssert] Error in axios!');
      logger.error(error.message);
      throw new APIError({
        message: error.message,
        status: error.status || (error.response && error.response.status),
        stack: error.stack
      });
    }
  }
  logger.debug('[Assert] response getted!');
  const status = _.get(result, 'data.status', {});
  if (status.type === 'SUCCESS') {
    logger.info('[EDFAssert] Success!');
    return result.data;
  }
  logger.error(`ERROR in EDF API!\n[${status.code}] ${status.message}\n${status.params}`);
  if (status.code === 'ERROR_ENTITY_INSTANCE_NOT_FOUND') {
    throw new APIError({
      message: `[${status.code}] ${status.message}: ${status.params}`,
      status: httpStatus.NOT_FOUND
    });
  } else {
    throw new APIError({
      message: `[${status.code}] ${status.message}\n${status.params}`,
      status: httpStatus.INTERNAL_SERVER_ERROR
    });
  }
  // time3 = performance.now() - time;
  // console.log(`Result is:\ntime1 = \t${time1}\ntime2 = \t${time2}\ntime3 = \t${time3}\naxios = \t${time2 - time1}`)
  // return result.data;
};
