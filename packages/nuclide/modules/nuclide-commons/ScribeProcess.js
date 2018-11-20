"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.__test__ = exports.default = void 0;

function _log4js() {
  const data = require("log4js");

  _log4js = function () {
    return data;
  };

  return data;
}

function _performanceNow() {
  const data = _interopRequireDefault(require("./performanceNow"));

  _performanceNow = function () {
    return data;
  };

  return data;
}

var _os = _interopRequireDefault(require("os"));

function _process() {
  const data = require("./process");

  _process = function () {
    return data;
  };

  return data;
}

function _which() {
  const data = _interopRequireDefault(require("./which"));

  _which = function () {
    return data;
  };

  return data;
}

function _once() {
  const data = _interopRequireDefault(require("./once"));

  _once = function () {
    return data;
  };

  return data;
}

function _passesGK() {
  const data = _interopRequireDefault(require("./passesGK"));

  _passesGK = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 *  strict-local
 * @format
 */
const DEFAULT_JOIN_TIMEOUT = 5000;
let SCRIBE_CAT_COMMAND = 'scribe_cat'; // On Mac OS, `scribe_cat` isn't quite the same as the server-side one:
// it only dumps its logs on exit. To make sure that logs are delivered
// in a timely manner, we'll periodically force-kill the process.

const DEFAULT_JOIN_INTERVAL = process.platform === 'darwin' ? 60000 : null; // If spawning the Scribe process takes this long, disable it.
// Node sometimes runs into strange issues where spawning() starts to block.
// https://github.com/nodejs/node/issues/14917

const SPAWN_TOO_LONG_MS = 2000;
/**
 * A wrapper of `scribe_cat` (https://github.com/facebookarchive/scribe/blob/master/examples/scribe_cat)
 * command. User could call `new ScribeProcess($scribeCategoryName)` to create a process and then
 * call `scribeProcess.write($object)` to save an JSON schemaed Object into scribe category.
 * It will also recover from `scribe_cat` failure automatically.
 */

class ScribeProcess {
  constructor(scribeCategory, joinInterval = DEFAULT_JOIN_INTERVAL) {
    this._scribeCategory = scribeCategory;
    this._joinInterval = joinInterval;

    this._getChildProcess();
  }
  /**
   * Check if `scribe_cat` exists in PATH.
   */


  static isEnabled() {
    return ScribeProcess._enabled;
  }
  /**
   * Write a string to a Scribe category.
   * Ensure newlines are properly escaped.
   * Returns false if something is wrong with the Scribe process (use a fallback instead.)
   */


  async write(message) {
    if (!ScribeProcess._enabled) {
      return false;
    }

    let child;

    try {
      child = await this._getChildProcess();
      await writeToStream(child.stdin, `${message}${_os.default.EOL}`);
    } catch (err) {
      ScribeProcess._enabled = false; // Note: Logging errors is potentially recursive, since they go through Scribe!
      // It's important that we set _enabled before logging errors in this file.

      (0, _log4js().getLogger)('ScribeProcess').error('Disabling ScribeProcess due to error:', err);
      return false;
    }

    return true;
  }
  /**
   * Waits for the remaining messages to be written, then closes the write stream. Resolves once the
   * process has exited. This method is called when the server shuts down in order to guarantee we
   * capture logging during shutdown.
   */


  async join(timeout = DEFAULT_JOIN_TIMEOUT) {
    const {
      _childPromise,
      _subscription
    } = this;

    if (_childPromise == null || _subscription == null) {
      return;
    } // join() renders the existing process unusable.
    // The next call to write() should create a new process, so clear out the references.
    // Note that we stored them in local variables already above.


    this._clear();

    const child = await _childPromise;
    const {
      stdin
    } = child;
    const waitForExit = new Promise(resolve => {
      child.on('exit', () => {
        resolve();
      });
      setTimeout(() => {
        _subscription.unsubscribe();

        resolve();
      }, timeout);
    }); // Make sure stdin has drained before ending it.

    if (!stdin.write(_os.default.EOL)) {
      stdin.once('drain', () => stdin.end());
    } else {
      stdin.end();
    }

    return waitForExit;
  }

  _getChildProcess() {
    if (this._childPromise) {
      return this._childPromise;
    } // Obtain a promise to get the child process, but don't start it yet.
    // this._subscription will have control over starting / stopping the process.


    const startTime = (0, _performanceNow().default)();
    const processStream = (0, _process().spawn)(SCRIBE_CAT_COMMAND, [this._scribeCategory], {
      dontLogInNuclide: true
    }).do(child => {
      const duration = (0, _performanceNow().default)() - startTime;

      if (duration > SPAWN_TOO_LONG_MS) {
        ScribeProcess._enabled = false;
        (0, _log4js().getLogger)('ScribeProcess').error(`Disabling ScribeProcess because spawn took too long (${duration}ms)`); // Don't raise any errors and allow the current write to complete.
        // However, the next write will fail due to the _enabled check.

        this.join();
      }

      child.stdin.setDefaultEncoding('utf8');
    }).finally(() => {
      // We may have already started a new process in the meantime.
      if (this._childPromise === childPromise) {
        this._clear();
      }
    }).publish();
    const childPromise = this._childPromise = processStream.first().toPromise();
    this._subscription = processStream.connect();

    if (this._joinInterval != null) {
      this._joinTimer = setTimeout(() => {
        this._joinTimer = null;
        this.join();
      }, this._joinInterval);
    }

    return childPromise;
  }

  _clear() {
    this._childPromise = null;
    this._subscription = null;

    if (this._joinTimer != null) {
      clearTimeout(this._joinTimer);
      this._joinTimer = null;
    }
  }

}

exports.default = ScribeProcess;
ScribeProcess._enabled = true;
ScribeProcess.isScribeCatOnPath = (0, _once().default)(async () => {
  const [whichCmd, gkEnabled] = await Promise.all([(0, _which().default)(SCRIBE_CAT_COMMAND), process.platform === 'darwin' ? (0, _passesGK().default)('nuclide_scribe_macos') : Promise.resolve(true)]);
  return whichCmd != null && gkEnabled;
});
const __test__ = {
  setScribeCatCommand(newCommand) {
    const originalCommand = SCRIBE_CAT_COMMAND;
    SCRIBE_CAT_COMMAND = newCommand;
    return originalCommand;
  }

};
exports.__test__ = __test__;

function writeToStream(stream, message) {
  return new Promise((resolve, reject) => {
    // According to `stream.write()` [docs][1], "If an error occurs, the
    // callback may or may not be called with the error as its first argument.
    // To reliably detect write errors, add a listener for the 'error' event."
    //
    // [1]: https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback
    const handleError = err => {
      reject(err);
      stream.removeListener('error', handleError);
    };

    stream.once('error', handleError);
    stream.write(message, err => {
      if (err != null) {
        handleError(err);
        return;
      }

      stream.removeListener('error', handleError);
      resolve();
    });
  });
}