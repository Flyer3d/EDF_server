const express = require('express');
const controller = require('../../controllers/auth.controller');

const router = express.Router();

/**
 * @api {post} api/auth/login Login user
 * @apiDescription Get an accessToken
 * @apiVersion 1.0.0
 * @apiName Login
 * @apiGroup Auth
 * @apiPermission public
 *
 * @apiParam  {String}          login     User's login
 * @apiParam  {String{6..128}}  password  User's password
 *
 * @apiSuccess  {String}  token.tokenType     Access Token's type
 * @apiSuccess  {String}  token.accessToken   Authorization Token
 * @apiSuccess  {String}  token.refreshToken  Token to get a new accessToken
 *                                                   after expiration time
 * @apiSuccess  {Number}  token.expiresIn     Access Token's expiration time
 *                                                   in miliseconds
 *
 * @apiSuccess  {String}  user.name           User's name
 * @apiSuccess  {String}  user.role           User's role
 *
 * @apiError (Bad Request 400)  ValidationError  Some parameters may contain invalid values
 * @apiError (Unauthorized 401)  Unauthorized     Incorrect login or password
 */

router.post('/login', (req, res) => controller.login(req, res));


/**
 * @api {post} api/auth/logout Logout
 * @apiDescription Get an accessToken
 * @apiVersion 1.0.0
 * @apiName Logout
 * @apiGroup Auth
 * @apiPermission public
 *
 * @apiSuccess {Number} status HTTP status code (204) No content
 */

router.post('/logout', (req, res) => controller.logout(req, res));

/**
 * @api {post} api/auth/refresh-token Refresh Token
 * @apiDescription Refresh expired accessToken
 * @apiVersion 1.0.0
 * @apiName RefreshToken
 * @apiGroup Auth
 * @apiPermission public
 *
 * @apiParam  {String}  login         User's login
 * @apiParam  {String}  refreshToken  Refresh token acquired when user logged in
 *
 * @apiSuccess {String}  tokenType     Access Token's type
 * @apiSuccess {String}  accessToken   Authorization Token
 * @apiSuccess {String}  refreshToken  Token to get a new accessToken after expiration time
 * @apiSuccess {Number}  expiresIn     Access Token's expiration time in miliseconds
 *
 * @apiError (Bad Request 400)  ValidationError  Some parameters may contain invalid values
 * @apiError (Unauthorized 401)  Unauthorized     Incorrect email or refreshToken
 */
router.post('/refresh-token', (req, res) => controller.refresh(req, res));

module.exports = router;
