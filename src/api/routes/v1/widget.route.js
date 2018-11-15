const express = require('express');
const controller = require('../../controllers/widget.controller');
const stepRouter = require('./widget_api/step.route');
const actionRouter = require('./widget_api/action.route');

const router = express.Router();

router.use('/step', stepRouter);
router.use('/action', actionRouter);

/**
 * @api {get} api/widget Widget list
 * @apiDescription Get a list of entities by query.model
 * @apiVersion 1.0.0
 * @apiName GetList
 * @apiGroup Widget
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  model     Model name
 * @apiParam  {String}  query     Filter query
 * @apiParam  {String}  orderBy     Order parameters
 * @apiParam  {String}  pageNumber     Page number
 * @apiParam  {String}  pageSize     Page size
 *
 * @apiSuccess {Object[]} entities List of entities.
 *
 */
router.get('/', (req, res) => controller.getList(req, res));

/**
 * @api {post} api/widget Create entity
 * @apiDescription Create
 * @apiVersion 1.0.0
 * @apiName Create
 * @apiGroup Widget
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  model     Model name
 * @apiParam  {Object}  data      Entity data
 *
 * @apiSuccess (Created 201) {Object}  data       Created entity
 */
router.post('/', (req, res) => controller.createItem(req, res));

/**
 * @api {get} api/widget/:modelName/:modelId Get entity
 * @apiDescription Get entity
 * @apiVersion 1.0.0
 * @apiName GetItem
 * @apiGroup Widget
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  modelName     Model name
 * @apiParam  {Number}  modelId     ModelId
 *
 * @apiSuccess {Object[]} entity Entity.
 *
 * @apiError (Forbidden 403)     Forbidden     ???Not enough rights to get the entity
 */
router.get('/:modelName/:modelId', (req, res) => {
  const id = req.params.modelId;
  const model = req.params.modelName;
  console.log(`Widget GET with model = ${model} and id = ${id}`);
  return controller.getItem(req, model, id, res);
});


/**
 * @api {get} api/widget/suggest Get suggest list
 * @apiDescription Get suggest list. Find result by substring in query.q
 * @apiVersion 1.0.0
 * @apiName Suggest
 * @apiGroup Widget
 * @apiPermission all
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiSuccess {[String]} List of Strings.
 *
 */
router.get('/suggest/', (req, res) => controller.suggest(req, res));

/**
 * @api {get} api/widget/:modelName Get entities by ids
 * @apiDescription Get entities of model using array of IDs
 * @apiVersion 1.0.0
 * @apiName GetItems
 * @apiGroup Widget
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  modelName     Model name
 * @apiParam  {Array{Number}} ids     Array of IDs
 *
 * @apiSuccess {Object[]} desktops List of desktops.
 *
 */
router.get('/:modelName', (req, res) => {
  const model = req.params.modelName;
  console.log(`Widget GET MULTI with model = ${model}`);
  return controller.getItems(req, model, res);
});

/**
 * @api {patch} api/widget/:modelName/:modelId Update entity
 * @apiDescription Update entity
 * @apiVersion 1.0.0
 * @apiName UpdateItem
 * @apiGroup Widget
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  modelName     Model name
 * @apiParam  {Number}  modelId     ModelId
 * @apiParam  {Object}  fields     Entity fields
 *
 * @apiSuccess {Object[]} entity Updated entity.
 *
 * @apiError (Forbidden 403)     Forbidden     Not enough rights to update the entity
 * @apiError (Not Found 404)    NotFound     Entity does not exist
 */
router.patch('/:modelName/:modelId', (req, res) => {
  const id = req.params.modelId;
  const model = req.params.modelName;
  console.log(`Widget PATCH with model = ${model} and id = ${id}`);
  return controller.saveItem(req, model, id, res);
});

/**
 * @api {delete} api/widget/:modelName/:modelId Delete entity
 * @apiDescription Update entity
 * @apiVersion 1.0.0
 * @apiName DeleteItem
 * @apiGroup Widget
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  modelName     Model name
 * @apiParam  {Number}  modelId     ModelId
 *
 * @apiSuccess (204) NO_CONTENT Successfully deleting entity.
 *
 * @apiError (Forbidden 403)     Forbidden     Not enough rights to delete the entity
 * @apiError (Not Found 404)    NotFound     Entity does not exist
 */
router.delete('/:modelName/:modelId', (req, res) => {
  const id = req.params.modelId;
  const model = req.params.modelName;
  console.log(`Widget DELETE with model = ${model} and id = ${id}`);
  return controller.deleteItem(req, model, id, res);
});

module.exports = router;
