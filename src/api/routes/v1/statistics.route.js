const express = require('express');
const controller = require('../../controllers/statistics.controller');

const router = express.Router();

router.post('/viewed', (req, res) => controller.viewed(req, res));

router.post('/getViews', (req, res) => controller.getViews(req, res));

module.exports = router;
