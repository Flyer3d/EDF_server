const express = require('express');
const controller = require('../../controllers/utils.controller');
const multipart = require('connect-multiparty');

const multipartMiddleware = multipart();
const router = express.Router();

/**
 * @api {post} api/img/ Save image to server
 * @apiDescription Upload image to server and returns file path (Sring)
 * @apiVersion 1.0.0
 * @apiName SaveImage
 * @apiGroup Img
 * @apiPermission public
 *
 * @apiSuccess {Object} Object, contains "filePath" String.
 */
router.post('/', multipartMiddleware, (req, res) => controller.uploadFile(req, res));

/**
 * @api {get} api/img/:fileName Get image from server
 * @apiDescription Get image from server
 * @apiVersion 1.0.0
 * @apiName GetImage
 * @apiGroup Img
 * @apiPermission public
 *
 * @apiParam  {String}  fileName     Image file name
 *
 * @apiSuccess {File} image.
 */
router.get('/:fileName', (req, res) => {
  req.query.fileName = req.params.fileName;
  req.query.fileStorage = 'images';
  return controller.downloadFile(req, res);
});
router.get('/UID/:fileUID/:fileName', (req, res) => {
  req.query.fileName = `UID/${req.params.fileUID}/${req.params.fileName}`;
  req.query.fileStorage = 'images';
  return controller.downloadFile(req, res);
});

module.exports = router;
