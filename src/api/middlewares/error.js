const httpStatus = require('http-status');
const expressValidation = require('express-validation');
const APIError = require('../utils/APIError');
const { env } = require('../../config/vars');

/**
 * Error handler. Send stacktrace only during development
 * @public
 */
const handler = (err, req, res, next) => {
  const error = err || {};
  const response = {
    code: error.status || 500,
    message: error.message || httpStatus[error.status],
    errors: error.errors,
    stack: error.stack
  };

  if (env !== 'development') {
    delete response.stack;
  }

  res.status(error.status || 500);
  res.json(response);
  res.end();
};
exports.handler = handler;

/**
 * If error is not an instanceOf APIError, convert it.
 * @public
 */
exports.converter = (err, req, res, next) => {
  let convertedError = err;

  if (err instanceof expressValidation.ValidationError) {
    convertedError = new APIError({
      message: 'Erro de Validação',
      errors: err.errors,
      status: err.status,
      stack: err.stack
    });
  } else if (!(err instanceof APIError)) {
    convertedError = new APIError({
      message: err.message,
      status: err.status,
      stack: err.stack
    });
  }

  return handler(convertedError, req, res);
};

/**
 * Catch 404 and forward to error handler
 * @public
 */
exports.badRequest = (errorMsg, req, res, next) => {
  const err = new APIError({
    message: `Bad request: ${errorMsg}`,
    status: httpStatus.BAD_REQUEST
  });
  return handler(err, req, res);
};

/**
 * Catch 404 and forward to error handler
 * @public
 */
exports.notFound = (req, res, next) => {
  const err = new APIError({
    message: 'Not found',
    status: httpStatus.NOT_FOUND
  });
  return handler(err, req, res);
};

/**
 * Catch 500 and forward to error handler
 * @public
 */
exports.internalError = (msg, req, res, next) => {
  const err = new APIError({
    message: `Internal Server Error: ${msg}`,
    status: httpStatus.INTERNAL_SERVER_ERROR
  });
  return handler(err, req, res);
};

