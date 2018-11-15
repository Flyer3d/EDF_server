const express = require('express');
const controller = require('../../controllers/chat.controller');

const router = express.Router();

/**
 * @api {post} api/chat/chatList Chats list
 * @apiDescription Get list of chats for user
 * @apiVersion 1.0.0
 * @apiName ChatList
 * @apiGroup Chat
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiSuccess {Object[]} entities List of bookmarks.
 *
 */
router.post('/chatList', (req, res) => controller.chatList(req, res));

/**
 * @api {post} api/chat/messageList Messages list
 * @apiDescription Get list of messages of chat
 * @apiVersion 1.0.0
 * @apiName MessageList
 * @apiGroup Chat
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {Number}  chatId      Chat id
 *
 * @apiSuccess (Created 201) {Object}  data       Created entity
 */
router.post('/messageList', (req, res) => controller.messageList(req, res));

/**
 * @api {post} api/chat/sendMessage Send new message
 * @apiDescription Send new message in chatroom
 * @apiVersion 1.0.0
 * @apiName sendMessage
 * @apiGroup Chat
 * @apiPermission public
 *
 * @apiHeader {String} Athorization User's access token
 *
 * @apiParam  {Number}  chatId    Chat id
 * @apiParam  {Number}  profileId   profileId
 * @apiParam  {file}  file      File attachment
 * @apiParam  {String}  message   Message
 * @apiParam  {String}  link  Internam
 *
 * @apiSuccess {No Content 204} bookmark deleted.
 *
 */
router.post('/sendMessage', (req, res) => controller.sendMessage(req, res));

module.exports = router;
