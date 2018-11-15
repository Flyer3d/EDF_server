const express = require('express');
const controller = require('../../controllers/mailto.controller');

const router = express.Router();

router.post('/slava', (req, res) => controller.mailToSlava(req, res));

module.exports = router;
