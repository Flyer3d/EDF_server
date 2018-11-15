// Create LOGGER
const { createLogger, format, transports } = require('winston');
const _ = require('lodash');
const { inspect } = require('util');
const DailyRotateFile = require('winston-daily-rotate-file');

const MESSAGE = Symbol.for('message');
const ENV = process.env.NODE_ENV;

const formatInfo = format((info, opts) => {
  if (_.isObject(info.message)) {
    if (opts.inspect) {
      info[MESSAGE] = inspect(info.message, false, opts.depth || null, opts.colorize || true);
    } else {
      info[MESSAGE] = JSON.stringify(info.message);
    }
  } else {
    info[MESSAGE] = info.message;
  }
  return info;
});

const enumerateErrorFormat = format((info) => {
  if (info.message instanceof Error) {
    info.message = Object.assign({
      message: info.message.message,
      stack: info.message.stack
    }, info.message);
  }

  if (info instanceof Error) {
    return Object.assign({
      message: info.message,
      stack: info.stack
    }, info);
  }
  return info;
});


function getLogger(module) {
  const path = module.filename.split('\\').slice(-2).join('\\');
  return createLogger({
    transports: [
      new transports.File({
        filename: './logs/error.log',
        level: 'error',
        format: format.combine(
          format.label({ label: path }),
          format.colorize(),
          format.timestamp({
            format: () => {
              const d = new Date();
              return `${d.getDate()}-${d.getMonth()}-${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
            }
          }),
          enumerateErrorFormat(),
          formatInfo(),
          format.printf(info => `${info.timestamp} ${info.label}: ${info[MESSAGE]}`)
        )
      }),
      new DailyRotateFile({
        dirname: './logs',
        filename: 'daily-%DATE%.log',
        datePattern: 'YYYY-MM-DD-HH',
        maxSize: '20m',
        maxFiles: '5d',
        // zippedArchive: true,     // Дает ошибку на Windows!
        prepend: true,
        label: path,
        format: format.combine(
          format.label({ label: path }),
          format.timestamp({
            format: () => {
              const d = new Date();
              return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}`;
            }
          }),
          enumerateErrorFormat(),
          formatInfo({ inspect: true }),

          format.printf(info => `[${info.timestamp} : ${info.label}->${info.level}]: ${info[MESSAGE]}`)
        ),
        level: process.env.ENV === 'development' ? 'debug' : 'info'
      }),
      new transports.Console({
        colorize: true,
        format: format.combine(
          format.label({ label: path }),
          format.colorize(),
          format.timestamp({
            format: () => {
              const d = new Date();
              return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}`;
            }
          }),
          enumerateErrorFormat(),
          formatInfo({ inspect: true }),
          format.printf(info => `[${info.timestamp} ${info.label}->${info.level}]: ${info[MESSAGE]}`)
        ),
        level: (ENV === 'development') ? 'debug' : 'info'
      })
    ],
    exitOnError: false
    // silent: true
  });
}

module.exports = getLogger;
