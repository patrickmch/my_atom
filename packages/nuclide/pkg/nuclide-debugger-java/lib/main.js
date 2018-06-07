'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createJavaAdditionalLogFilesProvider = createJavaAdditionalLogFilesProvider;
exports.consumeDevicePanelServiceApi = consumeDevicePanelServiceApi;

var _os = _interopRequireDefault(require('os'));

var _fsPromise;

function _load_fsPromise() {
  return _fsPromise = _interopRequireDefault(require('../../../modules/nuclide-commons/fsPromise'));
}

var _nuclideUri;

function _load_nuclideUri() {
  return _nuclideUri = _interopRequireDefault(require('../../../modules/nuclide-commons/nuclideUri'));
}

var _JavaDebuggerDevicePanelProvider;

function _load_JavaDebuggerDevicePanelProvider() {
  return _JavaDebuggerDevicePanelProvider = require('./JavaDebuggerDevicePanelProvider');
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function getAdditionalLogFilesOnLocalServer(deadline) {
  // The DebuggerLogger.java file is hard-coded to write logs to certain
  // filepaths (<tmp>/nuclide-<user>-logs/JavaDebuggerServer.log). We have to
  // make sure this function reads from the exact same name.

  // TODO(ljw): It looks like the Java code is writing to JavaDebuggerServer.log
  // but the Nuclide code was reading from .log.0? I don't understand why, so
  try {
    const results = [];
    const files = ['JavaDebuggerServer.log.0', 'JavaDebuggerServer.log'];
    await Promise.all(files.map(async file => {
      const filepath = (_nuclideUri || _load_nuclideUri()).default.join(_os.default.tmpdir(), `nuclide-${_os.default.userInfo().username}-logs`, file);
      let data = null;
      try {
        const stat = await (_fsPromise || _load_fsPromise()).default.stat(filepath);
        if (stat.size > 10 * 1024 * 1024) {
          data = 'file too big!'; // TODO(ljw): at least get the first 10Mb of it
        } else {
          data = await (_fsPromise || _load_fsPromise()).default.readFile(filepath, 'utf8');
        }
      } catch (e) {
        if (!e.message.includes('ENOENT')) {
          data = e.toString();
        }
      }
      if (data != null) {
        results.push({ title: filepath + '.txt', data });
      }
    }));
    return results;
  } catch (e) {
    return [];
  }
} /**
   * Copyright (c) 2015-present, Facebook, Inc.
   * All rights reserved.
   *
   * This source code is licensed under the license found in the LICENSE file in
   * the root directory of this source tree.
   *
   *  strict-local
   * @format
   */

function createJavaAdditionalLogFilesProvider() {
  return {
    id: 'java-debugger',
    getAdditionalLogFiles: getAdditionalLogFilesOnLocalServer
  };
}

function consumeDevicePanelServiceApi(api) {
  api.registerProcessTaskProvider(new (_JavaDebuggerDevicePanelProvider || _load_JavaDebuggerDevicePanelProvider()).JavaDebuggerDevicePanelProvider());
}