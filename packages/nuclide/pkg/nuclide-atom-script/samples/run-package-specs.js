"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _electron = _interopRequireDefault(require("electron"));

var _path = _interopRequireDefault(require("path"));

function _promise() {
  const data = require("../../../modules/nuclide-commons/promise");

  _promise = function () {
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
 *  strict-local
 * @format
 */

/* eslint-disable no-console */
// eslint-disable-next-line nuclide-internal/prefer-nuclide-uri
const {
  ipcRenderer,
  remote
} = _electron.default;

if (!(ipcRenderer != null && remote != null)) {
  throw new Error("Invariant violation: \"ipcRenderer != null && remote != null\"");
}

var runCommand = async function runCommand(args) {
  if (typeof args[0] !== 'string') {
    console.error(`Usage: atom-script ${__filename} <spec file>`);
    return 1;
  }

  const initialWindows = remote.BrowserWindow.getAllWindows();

  const packageSpecPath = _path.default.resolve(args[0]);

  ipcRenderer.send('run-package-specs', packageSpecPath); // Wait for the window to load

  await (0, _promise().sleep)(1000);
  const testWindow = remote.BrowserWindow.getAllWindows().find(browserWindow => {
    return !initialWindows.includes(browserWindow);
  });

  if (testWindow == null) {
    console.error('Could not find spec browser window.');
    return 1;
  } // If we don't wait for the spec window to close before finishing, we cause
  // the window to close.


  await new Promise(resolve => {
    testWindow.once('close', () => {
      resolve();
    });
  });
  return 0;
};

exports.default = runCommand;