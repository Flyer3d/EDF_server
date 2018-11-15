const express = require('express');
const controller = require('../../controllers/bookmark.controller');

const router = express.Router();

/**
 * @api {post} api/bookmark/list Bookmarks list
 * @apiDescription Get a list of bookmarks for user
 * @apiVersion 1.0.0
 * @apiName GetList
 * @apiGroup Bookmark
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  type     Bookmark type
 *
 * @apiSuccess {Object[]} entities List of bookmarks.
 *
 */
router.post('/list', (req, res) => controller.getList(req, res));

/**
 * @api {post} api/bookmark/addBookmark Add bookmark
 * @apiDescription Add new bookmark
 * @apiVersion 1.0.0
 * @apiName addBookmark
 * @apiGroup Bookmark
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {String}  type      Bookmark type
 * @apiParam  {Number}  entityId      Bookmarked entity id
 * @apiParam  {String}  entityDesc      Bookmarked entity description
 *
 * @apiSuccess (Created 201) {Object}  data       Created entity
 */
router.post('/addBookmark', (req, res) => controller.addBookmark(req, res));

/**
 * @api {post} api/bookmark/removeBookmark Remove bookmark
 * @apiDescription Remove bookmark by id
 * @apiVersion 1.0.0
 * @apiName removeBookmark
 * @apiGroup bookmark
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {Number}  id     Bookmark id
 *
 * @apiSuccess {No Content 204} bookmark deleted.
 *
 */
router.post('/removeBookmark', (req, res) => controller.removeBookmark(req, res));

module.exports = router;
