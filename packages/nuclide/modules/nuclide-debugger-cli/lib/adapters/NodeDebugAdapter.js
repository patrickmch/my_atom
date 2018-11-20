"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _debuggerRegistry() {
  const data = require("../../../nuclide-debugger-common/debugger-registry");

  _debuggerRegistry = function () {
    return data;
  };

  return data;
}

function _nuclideUri() {
  const data = _interopRequireDefault(require("../../../nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
    return data;
  };

  return data;
}

function _constants() {
  const data = require("../../../nuclide-debugger-common/constants");

  _constants = function () {
    return data;
  };

  return data;
}

function _VSPOptionsParser() {
  const data = _interopRequireDefault(require("../VSPOptionsParser"));

  _VSPOptionsParser = function () {
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
 * 
 * @format
 */
class NodeDebugAdapter {
  constructor() {
    this.key = _constants().VsAdapterTypes.NODE;
    this.type = 'node2';
    this.excludedOptions = new Set(['args', 'console', 'diagnosticLogging', 'externalConsole', 'noDebug', 'outputCapture', 'program', 'restart', 'trace', 'verboseDiagnosticLogging']);
    this.extensions = new Set(['.js']);
    this.customArguments = new Map([['sourceMapPathOverrides', {
      typeDescription: 'source-pattern replace-pattern ...',
      parseType: 'array',
      parser: _parseSourceMapPathOverrides
    }]]);
    this.muteOutputCategories = new Set(['telemetry', 'stderr']);
    this.asyncStopThread = null;
    this.supportsCodeBlocks = true;
    this._includedOptions = new Set(['address', 'port']);
  }

  parseArguments(args) {
    const action = args.attach ? 'attach' : 'launch';
    const root = (0, _debuggerRegistry().getAdapterPackageRoot)(this.key);
    const parser = new (_VSPOptionsParser().default)(root);
    const commandLineArgs = parser.parseCommandLine(this.type, action, this.excludedOptions, this._includedOptions, this.customArguments);

    if (action === 'launch') {
      const launchArgs = args._;
      const program = launchArgs[0];
      commandLineArgs.set('runtimeExecutable', process.execPath);
      commandLineArgs.set('args', launchArgs.splice(1));
      commandLineArgs.set('program', _nuclideUri().default.resolve(program));
      commandLineArgs.set('noDebug', false);
      commandLineArgs.set('cwd', _nuclideUri().default.resolve('.'));
    }

    return commandLineArgs;
  }

  transformLaunchArguments(args) {
    return args || {};
  }

  transformAttachArguments(args) {
    return args || {};
  }

  transformExpression(exp, isCodeBlock) {
    return exp;
  }

  async canDebugFile(file) {
    // no special cases, just use file extension
    return false;
  }

}

exports.default = NodeDebugAdapter;

function _parseSourceMapPathOverrides(entries) {
  if (entries.length % 2 !== 0) {
    throw new Error('Source map path overrides must be a list of pattern pairs.');
  }

  const result = {};

  while (entries.length !== 0) {
    result[entries[0]] = entries[1];
    entries.splice(0, 2);
  }

  return result;
}