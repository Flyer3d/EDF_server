const express = require('express');
const coreRoutes = require('./core.route');
const imgRoutes = require('./img.route');
const mailToRoutes = require('./mailto.route');
const layoutRoutes = require('./layout.route');
const desktopRoutes = require('./desktop.route');
const modelRoutes = require('./model.route');
const widgetRoutes = require('./widget.route');
const utilsRoutes = require('./utils.route');
const authRoutes = require('./auth.route');
const bookmarkRoutes = require('./bookmark.route');
const chatRoutes = require('./chat.route');
const statisticsRoutes = require('./statistics.route');

const router = express.Router();


/**
 * GET api/status
 */
router.get('/status', (req, res) => res.send('OK'));
/**
 * GET api/version
 */
router.get('/version', (req, res) => res.send('v1'));

/**
 * GET api/docs
 */
router.use('/docs', express.static('docs'));

router.use('/core', coreRoutes);
router.use('/img', imgRoutes);
router.use('/mailto', mailToRoutes);
router.use('/layout', layoutRoutes);
router.use('/desktop', desktopRoutes);
router.use('/model', modelRoutes);
router.use('/widget', widgetRoutes);
router.use('/utils', utilsRoutes);
router.use('/auth', authRoutes);
router.use('/bookmark', bookmarkRoutes);
router.use('/chat', chatRoutes);
router.use('/statistics', statisticsRoutes);

module.exports = router;
