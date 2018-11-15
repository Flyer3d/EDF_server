const express = require('express');
const controller = require('../../../controllers/widget_api/step.controller');

const router = express.Router();

/**
 * @api {get} api/widget/step Step list
 * @apiDescription Get a list of EDF_ProcessStep
 * @apiVersion 1.0.0
 * @apiName GetStepList
 * @apiGroup Widget/Step
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
 * @api {get} api/widget/step/:modelName/:modelId Get entity
 * @apiDescription Get entity
 * @apiVersion 1.0.0
 * @apiName GetItem
 * @apiGroup Widget/Step
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
  return controller.getData(req, model, id, res);
});

/**
 * @api {post} api/widget/step Save entity
 * @apiDescription Save entity
 * @apiVersion 1.0.0
 * @apiName Step
 * @apiGroup Widget/Step
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  model     Model name
 * @apiParam  {Number}  id        ModelId
 * @apiParam  {Object}  fields    Entity fields
 *
 * @apiSuccess {Object[]} entity Entity.
 *
 * @apiError (Forbidden 403)     Forbidden     ???Not enough rights to save the entity
 */
router.post('/', (req, res) => controller.saveData(req, res));

/**
 * @api {post} api/widget/step/:activityTypeId/:adapterTaskId Terminate step
 * @apiDescription Terminate step
 * @apiVersion 1.0.0
 * @apiName TerminateStep
 * @apiGroup Widget/Step
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  activityTypeId     Activity type id
 * @apiParam  {Number}  adapterTaskId     Adapter task id
 *
 * @apiSuccess (204) NO_CONTENT Successfully terminated step.
 *
 * @apiError (Forbidden 403)     Forbidden     Not enough rights to terminate step
 */
router.post('/:activityTypeId/:adapterTaskId', (req, res) => {
  const { activityTypeId, adapterTaskId } = req.params;
  console.log(`\nRoute to terminate step with activity = ${activityTypeId} and adapter = ${adapterTaskId}`);
  return controller.submitStep(req, activityTypeId, adapterTaskId, res);
});

/**
 * @api {post} api/widget/step/submitMonoStep Submit mono step
 * @apiDescription Submit mono step: start's process and terminate first step
 * @apiVersion 1.0.0
 * @apiName submitMonoStep
 * @apiGroup Widget/Step
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {Number}  processId       Process ID
 * @apiParam  {Object}  fields          Fields for first step
 *
 * @apiSuccess (204) NO_CONTENT Successfully terminated step.
 *
 * @apiError (Forbidden 403)     Forbidden     Not enough rights to execute process
 */
router.post('/submitMonoStep', (req, res) => controller.submitMonoStep(req, res));

module.exports = router;
