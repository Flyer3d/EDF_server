const express = require('express');


const router = express.Router();

router.get('/', (req, res) => res.json({
  status: {
    type: 'SUCCESS'
  }
}).end());

router.post('/', (req, res) => res.json({
  status: {
    type: 'SUCCESS'
  }
}).end());

/**
 * @api {post} api/createNewTask CreateNewTask for EDF core
 * @apiDescription Create new task
 * @apiVersion 1.0.0
 * @apiName GetLayout
 * @apiGroup Core
 * @apiPermission user
 *
 * @apiSuccess {Object} status: {type: 'SUCCESS'}.
 *
 * @apiSuccessExample Response (example):
 * {
 *   status: {
 *     type: 'SUCCESS'
 *   }
 * }
 *
 */
router.post('/createNewTask', (req, res) => {
  console.log('CORE!!!! CREATE NEW TASK!!!!!!');
  return res.json({
    status: {
      type: 'SUCCESS'
    }
  }).end();
});

module.exports = router;
