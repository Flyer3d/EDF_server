const logger = require('../utils/Logger')(module);
const decodeJWT = require('jwt-decode'); // аутентификация по JWT для hhtp
const md5 = require('md5');
const { edf } = require('../../config/vars');
const { EDFAssert } = require('../utils/Assert');
const _ = require('lodash');

const getUser = (token) => {
  if (token && token !== 'null') {
    try {
      const decodedToken = decodeJWT(token);
      logger.debug('[getUser] User = ');
      logger.debug(decodedToken);
      const roles = _.compact(_.get(decodedToken, 'EDF_ACM_Role', []).map(role => role.public_id));
      const user = {
        username: _.get(decodedToken, 'EDF_ACM_User.name'),
        userId: _.get(decodedToken, 'EDF_ACM_User.public_id'),
        roles
      };
      logger.debug('[getUser] User is:');
      logger.debug(user);
      return user;
    } catch (err) {
      logger.error('[getUser] Error decoding token!');
      logger.error(err.message);
    }
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const md5Pass = md5(password);
  let loginRes;
  logger.info(`Login with login = ${username} and password = ${password}`);

  try {
    loginRes = await EDFAssert({
      url: `${edf.uri}/authentication/v1/getToken`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        client_id: username,
        client_secret: md5Pass,
        grant_type: 'authorization_code'
      }
    });
  } catch (err) {
    if (err.status === 401) {
      logger.error(`[login] User ${username} not found`);
      return res.status(401).json({ message: 'Ошибка авторизации: пользователь не найден' }).end();
    }
    logger.error(`[login] Authorization error status = ${err.status}`);
    return res.status(err.status).json({ message: 'Ошибка авторизации!' }).end();
  }

  const user = getUser(loginRes.access_token);

  if (user) {
    logger.info('[login] successfully logged in!');
    logger.debug(Object.assign({}, user, loginRes));
    req.user = user;
    return res.status(200).json(Object.assign({}, user, loginRes)).end();
  }
  logger.error(`[login] User ${username} not found`);
  return res.status(401).json({ message: 'Ошибка авторизации: неверное имя пользователя / пароль!' }).end();
};


// Заглушка
exports.logout = async (req, res) => res.json({ ok: true }).end();

// Заглушка
exports.refresh = async (req, res) => res.json({ ok: true }).end();
