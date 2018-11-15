const express = require('express');
const controller = require('../../../controllers/widget_api/action.controller');

const router = express.Router();

/**
 * @api {get} api/widget/action Action list
 * @apiDescription Get a list of EDF_PoolModel
 * @apiVersion 1.0.0
 * @apiName GetActionList
 * @apiGroup Widget/Action
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  query     Filter query
 * @apiParam  {String}  orderBy     Order parameters
 * @apiParam  {String}  pageNumber     Page number
 * @apiParam  {String}  pageSize     Page size
 *
 * @apiSuccess {Object[]} entities List of action entities.
 *
 */
router.get('/', (req, res) => controller.getList(req, res));

/**
 * @api {post} api/widget/action/:actionId Do action!
 * @apiDescription Do action
 * @apiVersion 1.0.0
 * @apiName DoList
 * @apiGroup Widget/Action
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiSuccess (204) NO_CONTENT Successfully deleting entity.
 *
 * @apiError (Forbidden 403)     Forbidden     Not enough rights to perform action
 * @apiError (Not Found 404)    NotFound     Action doesn't exist
 */
router.post('/:actionId', (req, res) => {
  const id = req.params.actionId;
  return controller.doAction(req, id, res);
});

module.exports = router;
