const express = require('express');
const controller = require('../../controllers/model.controller');

const router = express.Router();

/**
 * @api {get} api/model Models list
 * @apiDescription Get list of available models. Find available models by substring in query.q
 * @apiVersion 1.0.0
 * @apiName Suggest
 * @apiGroup Model
 * @apiPermission admin
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiSuccess {Object[]} List of model .
 *
 * @apiError (Unauthorized 401)  Unauthorized  Only authenticated users can access the data
 * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
 */
router.get('/', (req, res) => controller.suggest(req, res));

/**
 * @api {get} api/model/model Get model description
 * @apiDescription Get model description by query.name
 * @apiVersion 1.0.0
 * @apiName Model
 * @apiGroup Model
 * @apiPermission admin
 *
 * @apiParam  {String}  model    Model name
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiSuccess {Object[]} model .
 *
 * @apiError (Unauthorized 401)  Unauthorized  Only authenticated users can access the data
 * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
 */
router.get('/model', (req, res) => controller.model(req, res));

/**
 * @api {get} api/model/stepListModel Get stepList model description
 * @apiDescription Get step list model description
 * @apiVersion 1.0.0
 * @apiName StepListModel
 * @apiGroup Model
 * @apiPermission ??admin
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiSuccess {Object[]} step list model .
 *
 * @apiError (Unauthorized 401)  Unauthorized  Only authenticated users can access the data
 * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
 */
router.get('/stepListModel', (req, res) => controller.stepListModel(req, res));

/**
 * @api {get} api/model/stepModel Get step model description
 * @apiDescription Get step model description
 * @apiVersion 1.0.0
 * @apiName StepModel
 * @apiGroup Model
 * @apiPermission admin
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  stepId        Step ID
 * @apiParam  {String}  processId     Process ID
 * @apiParam  {String}  flowNodeId    Activivy ID
 *
 * @apiSuccess {Object} Step model.
 *
 * @apiError (Unauthorized 401)  Unauthorized  Only authenticated users can access the data
 * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
 */
router.get('/stepModel', (req, res) => controller.stepModel(req, res));

/**
 * @api {get} api/model/stepModelByEventPk Get step model description
 * @apiDescription Get step model description by startEventPk
 * @apiVersion 1.0.0
 * @apiName StepModel
 * @apiGroup Model
 * @apiPermission admin
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  startEventPk  Start Event Pk
 *
 * @apiSuccess {Object} Step model.
 *
 * @apiError (Unauthorized 401)  Unauthorized  Only authenticated users can access the data
 * @apiError (Forbidden 403)     Forbidden     Only admins can access the data
 */
router.post('/stepModelByEventPk', (req, res) => controller.stepModelByEventPk(req, res));

module.exports = router;
