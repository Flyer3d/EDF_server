const logger = require('../utils/Logger')(module);
const decodeJWT = require('jwt-decode'); // аутентификация по JWT для hhtp
const EDF = require('../../config/EDF');
const _ = require('lodash');

// middleware for authentication
exports.authorize = (req, res, next) => {
  if (!req.headers.authorization) {
    if (req.headers.cookie) {
      const jwtCookie = req.headers.cookie.split(';').find(c => c.trim().startsWith('jwt='));
      const jwtTypeCookie = req.headers.cookie.split(';').find(c => c.trim().startsWith('jwt_type='));

      if (jwtCookie) {
        const accessToken = jwtCookie.split('=')[1];
        const tokenType = jwtTypeCookie && jwtTypeCookie.split('=')[1];
        req.headers.authorization = `${tokenType} ${accessToken}`;
      }
    }
    req.headers.authorization = req.headers.authorization || EDF.data.defaultAccessToken;
  }
  const rawToken = req.headers.authorization;
  const token = rawToken && rawToken.split(' ')[1];
  if (token && token !== 'null') {
    try {
      const decodedToken = decodeJWT(token);
      const roles = _.compact(_.get(decodedToken, 'EDF_ACM_Role', []).map(role => role.public_id));
      const user = {
        username: _.get(decodedToken, 'EDF_ACM_User.name'),
        userId: _.get(decodedToken, 'EDF_ACM_User.public_id'),
        roles
      };
      req.user = user;
    } catch (err) {
      logger.error('[authorize] Middleware. Error verifying token!');
      logger.error(err.message);

      delete res.headers.Authorization;
    }
  }
  // always continue to next middleware
  next();
};

// Depticated
exports.permit = (...allowed) => {
  const isAllowed = (roles) => {
    if (Array.isArray(roles)) {
      let result = false;
      roles.forEach((role) => {
        if (allowed.indexOf(role) > -1) {
          result = true;
        }
      });
      return result;
    }
    return allowed.indexOf(roles) > -1;
  };

  // return a middleware
  return (req, res, next) => {
    logger.debug(`[permit] Middleware with params: ${allowed}`);
    if (req.user && isAllowed(req.user.roles)) {
      next(); // role is allowed, so continue on the next middleware
    } else {
      res.status(403).json({ message: 'Forbidden' }); // user is forbidden
    }
  };
};
