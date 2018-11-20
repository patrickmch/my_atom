"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _lruCache() {
  const data = _interopRequireDefault(require("lru-cache"));

  _lruCache = function () {
    return data;
  };

  return data;
}

var _os = _interopRequireDefault(require("os"));

function _promise() {
  const data = require("../../../modules/nuclide-commons/promise");

  _promise = function () {
    return data;
  };

  return data;
}

function _process() {
  const data = require("../../../modules/nuclide-commons/process");

  _process = function () {
    return data;
  };

  return data;
}

function _log4js() {
  const data = require("log4js");

  _log4js = function () {
    return data;
  };

  return data;
}

function _ClangFlagsManager() {
  const data = _interopRequireDefault(require("./ClangFlagsManager"));

  _ClangFlagsManager = function () {
    return data;
  };

  return data;
}

function _ClangServer() {
  const data = _interopRequireDefault(require("./ClangServer"));

  _ClangServer = function () {
    return data;
  };

  return data;
}

function _findClangServerArgs() {
  const data = _interopRequireDefault(require("./find-clang-server-args"));

  _findClangServerArgs = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * 
 * @format
 */
// Limit the number of active Clang servers.
const SERVER_LIMIT = 20; // Limit the total memory usage of all Clang servers.

const DEFAULT_MEMORY_LIMIT = Math.round(_os.default.totalmem() * 15 / 100);

let _getDefaultFlags;

async function augmentDefaultFlags(src, flags) {
  if (_getDefaultFlags === undefined) {
    _getDefaultFlags = null;

    try {
      // $FlowFB
      _getDefaultFlags = require("./fb/custom-flags").getDefaultFlags;
    } catch (e) {// Open-source version
    }
  }

  if (_getDefaultFlags != null) {
    return flags.concat((await _getDefaultFlags(src)));
  }

  return flags;
}

class ClangServerManager {
  constructor() {
    this._memoryLimit = DEFAULT_MEMORY_LIMIT;
    this._flagsManager = new (_ClangFlagsManager().default)();
    this._servers = new (_lruCache().default)({
      max: SERVER_LIMIT,

      dispose(_, val) {
        val.dispose();
      }

    }); // Avoid race conditions with simultaneous _checkMemoryUsage calls.

    this._checkMemoryUsage = (0, _promise().serializeAsyncCall)(this._checkMemoryUsageImpl.bind(this));
  }

  getClangFlagsManager() {
    return this._flagsManager;
  }

  setMemoryLimit(percent) {
    this._memoryLimit = Math.round(Math.abs(_os.default.totalmem() * percent / 100));

    this._checkMemoryUsage();
  }
  /**
   * Spawn one Clang server per translation unit (i.e. source file).
   * This allows working on multiple files at once, and simplifies per-file state handling.
   *
   * TODO(hansonw): We should ideally restart on change for all service requests.
   * However, restarting (and refetching flags) can take a very long time.
   * Currently, there's no "status" observable, so we can only provide a busy signal to the user
   * on diagnostic requests - and hence we only restart on 'compile' requests.
   */


  getClangServer(src, contents, _requestSettings, _defaultSettings, restartIfChanged) {
    const requestSettings = _requestSettings || {
      compilationDatabase: null,
      projectRoot: null
    };
    const defaultSettings = _defaultSettings || {
      libclangPath: null,
      defaultFlags: null
    };

    let server = this._servers.get(src);

    if (server != null) {
      if (restartIfChanged && server.getFlagsChanged()) {
        this.reset(src);
      } else {
        return server;
      }
    }

    const compilationDB = requestSettings.compilationDatabase;
    server = new (_ClangServer().default)(src, contents, (0, _findClangServerArgs().default)(src, compilationDB == null ? null : compilationDB.libclangPath, defaultSettings.libclangPath), this._getFlags(src, requestSettings, defaultSettings));
    server.waitForReady().then(() => this._checkMemoryUsage());

    this._servers.set(src, server);

    return server;
  } // 1. Attempt to get flags from ClangFlagsManager.
  // 2. Otherwise, fall back to default flags.


  async _getFlags(src, requestSettings, defaultSettings) {
    const flagsData = await this._flagsManager.getFlagsForSrc(src, requestSettings).catch(e => {
      (0, _log4js().getLogger)('nuclide-clang-rpc').error(`Error getting flags for ${src}:`, e);
      return null;
    });

    if (flagsData != null && flagsData.flags.length > 0) {
      // Flags length could be 0 if the clang provider wants us to watch the
      // flags file but doesn't have accurate flags (e.g. header-only libs).
      return {
        flags: flagsData.flags,
        usesDefaultFlags: false,
        flagsFile: flagsData.flagsFile
      };
    } else if (defaultSettings.defaultFlags != null) {
      return {
        flags: await augmentDefaultFlags(src, defaultSettings.defaultFlags),
        usesDefaultFlags: true,
        flagsFile: flagsData != null ? flagsData.flagsFile : null
      };
    } else {
      return null;
    }
  }

  reset(src) {
    if (src != null) {
      this._servers.del(src);
    } else {
      this._servers.reset();
    }

    this._flagsManager.reset();
  }

  dispose() {
    this._servers.reset();

    this._flagsManager.reset();
  }

  async _checkMemoryUsageImpl() {
    const serverPids = this._servers // $FlowFixMe Missing in typings
    .values().map(server => server.getPID()).filter(Boolean);

    if (serverPids.length === 0) {
      return 0;
    }

    const usage = await (0, _process().memoryUsagePerPid)(serverPids);
    let total = Array.from(usage.values()).reduce((a, b) => a + b, 0); // Remove servers until we're under the memory limit.
    // Make sure we allow at least one server to stay alive.

    let count = usage.size;

    if (count > 1 && total > this._memoryLimit) {
      const toDispose = []; // $FlowFixMe Missing in typings

      this._servers.rforEach((server, key) => {
        const mem = usage.get(server.getPID());

        if (mem != null && count > 1 && total > this._memoryLimit) {
          total -= mem;
          count--;
          toDispose.push(key);
        }
      });

      toDispose.forEach(key => this._servers.del(key));
    }

    return total;
  }

}

exports.default = ClangServerManager;