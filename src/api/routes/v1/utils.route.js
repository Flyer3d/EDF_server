const express = require('express');
const controller = require('../../controllers/utils.controller');
const multipart = require('connect-multiparty');
// const expressProxy = require('express-http-proxy');
// const EDF = require('../../../config/EDF');

const multipartMiddleware = multipart();
const router = express.Router();

/**
 * @api {post} api/utils/uploadFile Save file to server
 * @apiDescription Uploads file to server and returns file ID (Sring)
 * @apiVersion 1.0.0
 * @apiName SaveFile
 * @apiGroup Utils
 * @apiPermission ??admin
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiSuccess {Object} Object, contains "filePath" String.
 *
 * @apiError (Unauthorized 401)  Unauthorized  Only authenticated users can access the data
 * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
 */
router.post('/uploadFile', multipartMiddleware, (req, res) => controller.uploadFile(req, res));


// ToDo: Для сквозного скачиваия! Включить, когда будет реализовано на JAVA
// router.post('/uploadFile', expressProxy(EDF.data.coreEndpoint, {
//   proxyReqPathResolver: (req) => {
//     console.log(`REPLACE PATH for url: ${req.url}`);
//     return req.url.replace(/uploadFile/, 'putFile');
//   },
//   proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
//     // you can update headers
//     proxyReqOpts.headers.host = EDF.data.coreEndpoint;
//     return proxyReqOpts;
//   }
// }));

/**
 * @api {get} api/utils/downloadFile Get file from server
 * @apiDescription Downloads file from server
 * @apiVersion 1.0.0
 * @apiName DownloadFile
 * @apiGroup Utils
 * @apiPermission ??admin
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiSuccess {File} File
 *
 * @apiError (Unauthorized 401)  Unauthorized  Only authenticated users can access the data
 * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
 */
router.get('/downloadFile', (req, res) => controller.downloadFile(req, res));


module.exports = router;
