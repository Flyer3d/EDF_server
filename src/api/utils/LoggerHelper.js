
const init = () => {
  Object.defineProperty(global, '__stack', {
    get: () => {
      const orig = Error.prepareStackTrace;
      Error.prepareStackTrace = function (_, stack) {
        return stack;
      };
      const err = new Error();
      Error.captureStackTrace(err, arguments.callee);
      const { stack } = err;
      Error.prepareStackTrace = orig;
      return stack;
    }
  });

  Object.defineProperty(global, '__line', {
    get: () => __stack[1].getLineNumber()
  });

  Object.defineProperty(global, '__function', {
    get: () => __stack[1].getFunctionName()
  });
};

exports.init = init;
