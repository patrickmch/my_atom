"use strict";

var React = _interopRequireWildcard(require("react"));

function _createPackage() {
  const data = _interopRequireDefault(require("../nuclide-commons-atom/createPackage"));

  _createPackage = function () {
    return data;
  };

  return data;
}

function _AutoGenLaunchAttachProvider() {
  const data = require("../nuclide-debugger-common/AutoGenLaunchAttachProvider");

  _AutoGenLaunchAttachProvider = function () {
    return data;
  };

  return data;
}

function _nuclideDebuggerCommon() {
  const data = require("../nuclide-debugger-common");

  _nuclideDebuggerCommon = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * 
 * @format
 */
class Activation {
  constructor() {}

  dispose() {}

  createDebuggerProvider() {
    return {
      type: _nuclideDebuggerCommon().VsAdapterTypes.NODE,
      getLaunchAttachProvider: connection => {
        return new (_AutoGenLaunchAttachProvider().AutoGenLaunchAttachProvider)(_nuclideDebuggerCommon().VsAdapterNames.NODE, connection, getNodeConfig());
      }
    };
  }

}

function getNodeConfig() {
  const program = {
    name: 'program',
    type: 'string',
    description: 'Absolute path to the program.',
    required: true,
    visible: true
  };
  const cwd = {
    name: 'cwd',
    type: 'string',
    description: 'Absolute path to the working directory of the program being debugged.',
    required: true,
    visible: true
  };
  const stopOnEntry = {
    name: 'stopOnEntry',
    type: 'boolean',
    description: 'Automatically stop program after launch.',
    defaultValue: false,
    required: false,
    visible: true
  };
  const args = {
    name: 'args',
    type: 'array',
    itemType: 'string',
    description: 'Command line arguments passed to the program.',
    defaultValue: [],
    required: false,
    visible: true
  };
  const runtimeExecutable = {
    name: 'runtimeExecutable',
    type: 'string',
    description: '(Optional) Runtime to use, an absolute path or the name of a runtime available on PATH',
    required: false,
    visible: true
  };
  const env = {
    name: 'env',
    type: 'object',
    description: '(Optional) Environment variables (e.g. SHELL=/bin/bash PATH=/bin)',
    defaultValue: {},
    required: false,
    visible: true
  };
  const outFiles = {
    name: 'outFiles',
    type: 'array',
    itemType: 'string',
    description: '(Optional) When source maps are enabled, these glob patterns specify the generated JavaScript files',
    defaultValue: [],
    required: false,
    visible: true
  };
  const protocol = {
    name: 'protocol',
    type: 'string',
    description: '',
    defaultValue: 'inspector',
    required: false,
    visible: false
  };
  const consoleEnum = {
    name: 'console',
    type: 'enum',
    enums: ['internalConsole', 'integratedTerminal'],
    description: 'Integrated Terminal means that it will run in a terminal that can interact with standard input and output.',
    defaultValue: 'internalConsole',
    required: true,
    visible: true
  };
  const port = {
    name: 'port',
    type: 'number',
    description: 'Port',
    required: true,
    visible: true
  };
  return {
    launch: {
      launch: true,
      vsAdapterType: _nuclideDebuggerCommon().VsAdapterTypes.NODE,
      properties: [program, cwd, stopOnEntry, args, runtimeExecutable, env, outFiles, protocol, consoleEnum],
      scriptPropertyName: 'program',
      cwdPropertyName: 'cwd',
      scriptExtension: '.js',
      header: React.createElement("p", null, "This is intended to debug node.js files (for node version 6.3+)."),

      getProcessName(values) {
        let processName = values.program;
        const lastSlash = processName.lastIndexOf('/');

        if (lastSlash >= 0) {
          processName = processName.substring(lastSlash + 1, processName.length);
        }

        return processName + ' (Node)';
      }

    },
    attach: {
      launch: false,
      vsAdapterType: _nuclideDebuggerCommon().VsAdapterTypes.NODE,
      properties: [port],
      scriptExtension: '.js',
      header: React.createElement("p", null, "Attach to a running node.js process"),

      getProcessName(values) {
        return 'Port: ' + values.port + ' (Node attach)';
      }

    }
  };
}

(0, _createPackage().default)(module.exports, Activation);