const express = require('express');
const controller = require('../../controllers/desktop.controller');
const { permit } = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  /**
   * @api {get} api/desktop Desktop list
   * @apiDescription Get a list of aviable desktops
   * @apiVersion 1.0.0
   * @apiName GetDesltopList
   * @apiGroup Desktop
   * @apiPermission admin
   *
   * @apiHeader {String} Athorization User's access token
   *
   * @apiSuccess {Object[]} desktops List of desktops.
   *
   * @apiError (Unauthorized 401)  Unauthorized  Only authenticated users can access the data
   * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
   */
  .get((req, res) => controller.list(req, res));

/**
 * @api {post} api/desktop/getDesktops Get Desktops
* @apiDescription Get Desktops
* @apiVersion 1.0.0
* @apiName GetDesktops
* @apiGroup Desktop
* @apiPermission public
*
* @apiHeader {String} Athorization  User's access token
*
* @apiParam  {Array}  desktops     Array of desktop names/ids {String/Number}
*
* @apiSuccess {Object} desktop data.
*
* @apiError (Unauthorized 401)  Unauthorized  Only authenticated Users can access the data
* @apiError (Forbidden 403)     Forbidden     Only determined users can access the data
* @apiError (Not Found 404)    NotFound     Desktop does not exist
*/
router.post('/getDesktops', (req, res) => controller.loadDesktops(req, res));

/**
 * @api {put} api/desktop/:desktopName Update Desktop
 * @apiDescription Update existing Desktop by name / create new desktop by name
 * @apiVersion 1.0.0
 * @apiName UpdateDesktop
 * @apiGroup Desktop
 * @apiPermission admin
 *
 * @apiHeader {String} Athorization  User's access token
 *
 * @apiSuccess (No Content 204)  Successfully updated
 *
 * @apiError (Unauthorized 401)  Unauthorized  Only authenticated Users can access the data
 * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
 */
router.put('/:desktopName', permit('web_admin', 'admin', 'role.admin'), (req, res) => {
  const name = req.params.desktopName;
  return controller.save(req, name, res);
});

/**
 * @api {delete} api/desktop/:id Delete Desktop by ID
 * @apiDescription Delete a desktop
 * @apiVersion 1.0.0
 * @apiName DeleteDesktop
 * @apiGroup Desktop
 * @apiPermission user
 *
 * @apiHeader {String} Athorization  User's access token
 *
 * @apiSuccess (No Content 204)  Successfully deleted
 *
 * @apiError (Unauthorized 401) Unauthorized  Only authenticated users can delete the data
 * @apiError (Forbidden 403)    Forbidden     Only user with same id or admins can delete the data
 * @apiError (Not Found 404)    NotFound      Desktop does not exist
 */
router.delete('/:desktopId', permit('web_admin', 'admin', 'role.admin'), (req, res) => {
  const id = req.params.desktopId;
  return controller.delete(req, id, res);
});

module.exports = router;
