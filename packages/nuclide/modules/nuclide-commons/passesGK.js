"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isGkEnabled = isGkEnabled;
exports.onceGkInitialized = onceGkInitialized;
exports.onceGkInitializedAsync = onceGkInitializedAsync;
exports.getCacheEntries = getCacheEntries;
exports.default = void 0;

function _once() {
  const data = _interopRequireDefault(require("./once"));

  _once = function () {
    return data;
  };

  return data;
}

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("./UniversalDisposable"));

  _UniversalDisposable = function () {
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

/**
 * Get the actual Gatekeeper constructor or stub the relevant methods for OSS
 * friendliness.
 */
const getGatekeeper = (0, _once().default)(() => {
  let Gatekeeper;

  try {
    // $FlowFB
    Gatekeeper = require("../fb-gatekeeper-raw").Gatekeeper; // eslint-disable-line nuclide-internal/modules-dependencies
  } catch (e) {
    Gatekeeper = class {
      isGkEnabled(name) {
        return null;
      }

      asyncIsGkEnabled(name, timeout) {
        return Promise.resolve();
      }

      onceGkInitialized(callback) {
        let canceled = false;
        process.nextTick(() => {
          if (!canceled) {
            callback();
          }
        });
        return new (_UniversalDisposable().default)(() => {
          canceled = true;
        });
      }

      getCacheEntries() {
        return [];
      }

    };
  }

  return new Gatekeeper();
});
/**
 * Check a GK. Silently return false on error.
 *
 * (NOTE) The underlying module (fb-gatekeeper) checks the Unix name the node
 * process is running on. If you use this predicate in a package running on the
 * server (e.g., a language service backend) then it might not check the Unix
 * name you expect (e.g., `svmscm` on an On Demand instead of the user's Unix
 * name).
 */

var passesGK = async function passesGK(name, // timeout in ms
timeout) {
  const gatekeeper = getGatekeeper();

  try {
    return (await gatekeeper.asyncIsGkEnabled(name, timeout)) === true;
  } catch (e) {
    // If the Gatekeeper class implements caching, this may retrieve a cached value.
    return gatekeeper.isGkEnabled(name) === true;
  }
};
/**
 * Synchronous GK check. There is no guarantee that GKs have loaded. This
 * should be used inside a `onceGkInitialized`.
 *
 * (NOTE) The underlying module (fb-gatekeeper) checks the Unix name the node
 * process is running on. If you use this predicate in a package running on the
 * server (e.g., a language service backend) then it might not check the Unix
 * name you expect (e.g., `svmscm` on an On Demand instead of the user's Unix
 * name).
 */


exports.default = passesGK;

function isGkEnabled(name) {
  return getGatekeeper().isGkEnabled(name);
}

function onceGkInitialized(callback) {
  return getGatekeeper().onceGkInitialized(callback);
}

function onceGkInitializedAsync() {
  return new Promise(resolve => {
    getGatekeeper().onceGkInitialized(() => resolve());
  });
}

function getCacheEntries() {
  return getGatekeeper().getCacheEntries();
}