const express = require('express');
const controller = require('../../controllers/layout.controller');

const router = express.Router();

router
  .route('/')
  /**
   * @api {get} api/layout Layouts list
   * @apiDescription Get a list of layouts
   * @apiVersion 1.0.0
   * @apiName LayoutList
   * @apiGroup Layout
   * @apiPermission admin
   *
   * @apiHeader {String} Athorization User's access token
   *
   * @apiSuccess {Object[]} layouts   List of layouts.
   *
   * @apiError (Unauthorized 401)  Unauthorized  Only authenticated users can access the data
   * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
   */
  .get((req, res) => controller.list(req, res))

  /**
   * @api {post} api/layout Create Layout
   * @apiDescription Create a new layout
   * @apiVersion 1.0.0
   * @apiName CreateLayout
   * @apiGroup Layout
   * @apiPermission admin
   *
   * @apiHeader {String} Athorization  User's access token
   *
   * @apiParam  {Object}             data     New layout's data
   *
   * @apiSuccess (Created 201) {Object}  data       Created layout
   *
   * @apiError (Bad Request 400)   ValidationError  Some parameters may contain invalid values
   * @apiError (Unauthorized 401)  Unauthorized     Only authenticated users can create the data
   * @apiError (Forbidden 403)     Forbidden        Only admins can create the data
   */
  .post((req, res) => {
    const { body } = req;
    const type = (body && body.data && body.data.type) || 'layout';
    if (type === 'layout') {
      controller.createLayout(req, res);
    } else if (type === 'page') {
      controller.createPage(req, res);
    }
  });

/**
 * @api {get} api/layout/:id Get Layout
 * @apiDescription Get Layout
 * @apiVersion 1.0.0
 * @apiName GetLayout
 * @apiGroup Layout
 * @apiPermission user
 *
 * @apiHeader {String} Athorization  User's access token
 *
 * @apiSuccess {Object} layout data.
 *
 * @apiError (Unauthorized 401)  Unauthorized  Only authenticated Users can access the data
 * @apiError (Not Found 404)    NotFound     Layout does not exist
 */
router.get('/:layout', (req, res) => {
  const { layout } = req.params;
  return controller.load(req, layout, res);
});

/**
 * @api {put} api/layout/:id Update Layout
 * @apiDescription Update all Layout settings
 * @apiVersion 1.0.0
 * @apiName UpdateLayout
 * @apiGroup Layout
 * @apiPermission admin
 *
 * @apiParam  {Object}             data     New layout's data
 *
 * @apiHeader {String} Athorization  User's access token
 *
 * @apiSuccess (No Content 204)  Successfully updated
 *
 * @apiError (Unauthorized 401)  Unauthorized  Only authenticated Users can access the data
 * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
 * @apiError (Not Found 404)    NotFound     Layout does not exist
 */
router.put('/:layoutId', (req, res) => {
  console.log('PUT LAYOUT');
  console.dir(req.params);
  const id = req.params.layoutId;
  return controller.update(req, id, res);
});

/**
 * @api {patch} api/layout/:id Delete Layout
 * @apiDescription Delete a layout
 * @apiVersion 1.0.0
 * @apiName DeleteLayout
 * @apiGroup Layout
 * @apiPermission user
 *
 * @apiHeader {String} Athorization  User's access token
 *
 * @apiSuccess (No Content 204)  Successfully deleted
 *
 * @apiError (Unauthorized 401) Unauthorized  Only authenticated users can delete the data
 * @apiError (Forbidden 403)    Forbidden     Only user with same id or admins can delete the data
 * @apiError (Not Found 404)    NotFound      Layout does not exist
 */
router.delete('/:layoutId', (req, res) => {
  const id = req.params.layoutId;
  return controller.delete(req, id, res);
});

module.exports = router;
