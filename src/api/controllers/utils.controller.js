const httpStatus = require('http-status');
const { handler, notFound } = require('../middlewares/error');
const { EDFAssert } = require('../utils/Assert');
const _ = require('lodash');
const axios = require('axios');
const EDF = require('../../config/EDF');
const fs = require('fs-extra');
const FormData = require('form-data');
const multiparty = require('multiparty');
const logger = require('../utils/Logger')(module);


// /////////////////////////////////////////////////////////////////////////
function getHeaders(form) {
  return new Promise((resolve, reject) => {
    form.getLength((err, length) => {
      if (err) { reject(err); }
      const headers = Object.assign({ 'Content-Length': length }, form.getHeaders());
      resolve(headers);
    });
  });
}

exports.uploadFile = async (req, res) => {
  const query = req.body;
  logger.info(`[uploadFile] Uploading file ${_.get(req, 'files.file.path')}. Query is:`);
  logger.info(query);
  const form = new FormData();
  form.append('file', fs.createReadStream(req.files.file.path), Array.isArray(query.fileName) ? query.fileName[0] : query.fileName);
  form.append('fileStorage', Array.isArray(query.fileStorage) ? query.fileStorage[0] : query.fileStorage);
  form.append('fileName', Array.isArray(query.fileName) ? query.fileName[0] : query.fileName);
  logger.debug('[uploadFile] FormData is:');
  logger.debug(form);
  try {
    const headers = await getHeaders(form);
    logger.debug('[uploadFile] HEADERS RESIVED!!!');
    logger.debug(headers);
    logger.debug(Object.assign({}, { Authorization: req.headers.authorization || EDF.defaultAccessToken }, headers));

    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/putFile`,
      method: 'post',
      responseType: 'json',
      data: form,
      headers: Object.assign({}, { Authorization: req.headers.authorization || EDF.defaultAccessToken }, headers)
    });

    logger.info('[uploadFile] File sended!');
    logger.info(result.status);

    try {
      logger.debug('[uploadFile] Truing to remove file');
      await fs.remove(req.files.file.path);
      logger.info(`[uploadFile] Successefully deleteng file ${req.files.file.path}`);
    } catch (err) {
      logger.error(`[uploadFile] Error deleting file ${req.files.file.path}`);
      logger.error(err.message);
    }
    res.status(httpStatus.OK);
    return res.json(_.get(result, 'data')).end();
  } catch (err) {
    logger.error(`[uploadFile] Axios error upload FILE!!! ${req.files.file.path}`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};

function formParseAsync(data, headers) {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form();
    form.parse(data, (err, fields, files) => {
      if (err) {
        logger.error('[formParseAsync] Error parsing form data!');
        logger.error(headers);
        logger.error(err.message);
        logger.error(err);
        console.error(data);
        console.error(err);
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}


exports.downloadFile = async (req, res) => {
  logger.info('[downloadFile] Download file ! ');
  logger.info(req.query);
  const { fileName, fileStorage } = req.query;
  try {
    logger.debug('[downloadFile] downloading file');
    logger.debug(req.headers);
    logger.debug(EDF.data.defaultAccessToken);
    logger.debug({
      url: `${EDF.data.coreEndpoint}/getFile`,
      method: 'post',
      responseType: 'stream',
      headers: { Authorization: req.headers.authorization || EDF.data.defaultAccessToken },
      data: {
        fileName,
        fileStorage
      }
    });
    let result;
    try {
      result = await axios({
        // url: `${EDF.data.coreEndpoint}/getFile`,
        url: `${EDF.data.coreEndpoint}/downloadFile`,
        method: 'post',
        responseType: 'stream',
        headers: { Authorization: req.headers.authorization || EDF.data.defaultAccessToken },
        data: {
          fileName,
          fileStorage
        }
      });
    } catch (err) {
      logger.error('[downloadFile] Error getting file!!!');
      logger.error(err.message);
      return notFound(req, res);
    }
    const resultHeaders = result.headers || {};
    logger.debug('[downloadFile] File resived!!!');
    logger.debug(resultHeaders);

    res.type(resultHeaders['content-type']);
    logger.debug('[downloadFile] Res.type setted!!!!');
    // /////////////////////////////// PIPE ////////////////////////

    result.data.pipe(res);
    return true;
  } catch (err) {
    logger.error('[downloadFile] Axios error downloading file');
    logger.error(err.message);
    logger.error(err.stack);
    return handler(err, req, res);
  }
};
