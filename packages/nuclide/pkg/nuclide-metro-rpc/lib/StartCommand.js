'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getStartCommandFromNodePackage = getStartCommandFromNodePackage;
exports.getStartCommandFromBuck = getStartCommandFromBuck;

var _nuclideBuckRpc;

function _load_nuclideBuckRpc() {
  return _nuclideBuckRpc = require('../../nuclide-buck-rpc');
}

var _fsPromise;

function _load_fsPromise() {
  return _fsPromise = _interopRequireDefault(require('../../../modules/nuclide-commons/fsPromise'));
}

var _nuclideUri;

function _load_nuclideUri() {
  return _nuclideUri = _interopRequireDefault(require('../../../modules/nuclide-commons/nuclideUri'));
}

var _ini;

function _load_ini() {
  return _ini = _interopRequireDefault(require('ini'));
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

async function getStartCommandFromNodePackage(projectRoot) {
  return (await getStartCommandFromNodeModules(projectRoot)) || getStartCommandFromReactNative(projectRoot);
}

async function getStartCommandFromBuck(projectRoot) {
  const buckProjectRoot = await (0, (_nuclideBuckRpc || _load_nuclideBuckRpc()).getRootForPath)(projectRoot);
  if (buckProjectRoot == null) {
    return null;
  }
  // TODO(matthewwithanm): Move this to BuckUtils?
  const filePath = (_nuclideUri || _load_nuclideUri()).default.join(buckProjectRoot, '.buckconfig');
  const content = await (_fsPromise || _load_fsPromise()).default.readFile(filePath, 'utf8');
  const parsed = (_ini || _load_ini()).default.parse(`scope = global\n${content}`);
  const section = parsed['react-native'];
  if (section == null || section.server == null) {
    return null;
  }
  return {
    cwd: buckProjectRoot,
    args: ['--disable-global-hotkey'],
    command: section.server
  };
}

/**
 * Look in the nearest node_modules directory for react-native and extract the packager script if
 * it's found.
 */
async function getStartCommandFromNodeModules(projectRoot) {
  const nodeModulesParent = await (_fsPromise || _load_fsPromise()).default.findNearestFile('node_modules', projectRoot);
  if (nodeModulesParent == null) {
    return null;
  }

  const command = await getCommandForCli((_nuclideUri || _load_nuclideUri()).default.join(nodeModulesParent, 'node_modules', 'react-native'));

  return command == null ? null : Object.assign({}, command, {
    cwd: nodeModulesParent
  });
}

/**
 * See if this is React Native itself and, if so, return the command to run the packager. This is
 * special cased so that the bundled examples work out of the box.
 */
async function getStartCommandFromReactNative(dir) {
  const projectRoot = await (_fsPromise || _load_fsPromise()).default.findNearestFile('package.json', dir);
  if (projectRoot == null) {
    return null;
  }
  const filePath = (_nuclideUri || _load_nuclideUri()).default.join(projectRoot, 'package.json');
  const content = await (_fsPromise || _load_fsPromise()).default.readFile(filePath, 'utf8');
  const parsed = JSON.parse(content);
  const isReactNative = parsed.name === 'react-native';

  if (!isReactNative) {
    return null;
  }

  const command = await getCommandForCli(projectRoot);

  return command == null ? null : Object.assign({}, command, {
    cwd: projectRoot
  });
}

async function getCommandForCli(pathToReactNative) {
  const cliPath = (_nuclideUri || _load_nuclideUri()).default.join(pathToReactNative, 'local-cli', 'cli.js');
  const cliExists = await (_fsPromise || _load_fsPromise()).default.exists(cliPath);
  if (!cliExists) {
    return null;
  }
  return {
    command: 'node',
    args: [cliPath, 'start']
  };
}