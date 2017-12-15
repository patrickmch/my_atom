var Helpers = {
  wrap: function(func, callback) {
      function wrapped() {
          try {
              return func.apply(this, arguments);
          } catch (e) {
              callback(e);
              throw e;
          }
      }
      return wrapped;
  },

  wrapAsync: function(window, callback) {
      var _helper = function _helper(fnName) {
          var originalFn = window[fnName];
          window[fnName] = function traceKitAsyncExtension() {
              // Make a copy of the arguments
              var args = Array.prototype.slice.call(arguments, 0);
              var originalCallback = args[0];
              if (typeof (originalCallback) === 'function') {
                  args[0] = Helpers.wrap(originalCallback, callback);
              }
              // IE < 9 doesn't support .call/.apply on setInterval/setTimeout, but it
              // also only supports 2 argument and doesn't care what "this" is, so we
              // can just call the original function directly.
              if (originalFn.apply) {
                  return originalFn.apply(this, args);
              } else {
                  return originalFn(args[0], args[1]);
              }
          };
      };

      _helper('setTimeout');
      _helper('setInterval');
  }
};
