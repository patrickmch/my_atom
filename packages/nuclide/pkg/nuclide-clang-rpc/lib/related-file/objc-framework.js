"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRelatedHeaderForSourceFromFramework = getRelatedHeaderForSourceFromFramework;
exports.getRelatedSourceForHeaderFromFramework = getRelatedSourceForHeaderFromFramework;

function _nuclideUri() {
  const data = _interopRequireDefault(require("../../../../modules/nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
    return data;
  };

  return data;
}

function _utils() {
  const data = require("../utils");

  _utils = function () {
    return data;
  };

  return data;
}

function _common() {
  const data = require("./common");

  _common = function () {
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
function getFrameworkStructureFromSourceDir(dir) {
  const paths = _nuclideUri().default.split(dir).reverse();

  const rootIndex = paths.findIndex(folderName => folderName === 'Sources');

  if (rootIndex === -1) {
    return null;
  }

  const frameworkName = paths[rootIndex + 1];

  const frameworkPath = _nuclideUri().default.join(...paths.slice(rootIndex + 1).reverse());

  const frameworkSubPaths = paths.slice(0, rootIndex);
  const frameworkSubFolder = frameworkSubPaths.length === 0 ? '' : _nuclideUri().default.join(...frameworkSubPaths.reverse());
  return {
    frameworkPath,
    frameworkName,
    frameworkSubFolder
  };
}

function getFrameworkStructureFromHeaderDir(dir) {
  const paths = _nuclideUri().default.split(dir).reverse();

  const rootIndex = paths.findIndex(folderName => ['Headers', 'PrivateHeaders'].includes(folderName));

  if (rootIndex === -1) {
    return null;
  }

  const frameworkName = paths[rootIndex + 1];

  const frameworkPath = _nuclideUri().default.join(...paths.slice(rootIndex + 1).reverse());

  const frameworkSubPaths = paths.slice(0, rootIndex - 1);
  const frameworkSubFolder = frameworkSubPaths.length === 0 ? '' : _nuclideUri().default.join(...frameworkSubPaths.reverse());
  return {
    frameworkPath,
    frameworkName,
    frameworkSubFolder
  };
}

async function getRelatedHeaderForSourceFromFramework(src) {
  const frameworkStructure = getFrameworkStructureFromSourceDir(_nuclideUri().default.dirname(src));

  if (frameworkStructure == null) {
    return null;
  }

  const {
    frameworkPath,
    frameworkName,
    frameworkSubFolder
  } = frameworkStructure;
  const basename = (0, _utils().getFileBasename)(src);
  const headers = await Promise.all(['Headers', 'PrivateHeaders'].map(headerFolder => (0, _common().searchFileWithBasename)(_nuclideUri().default.join(frameworkPath, headerFolder, frameworkName, frameworkSubFolder), basename, _utils().isHeaderFile)));
  return headers.find(file => file != null);
}

async function getRelatedSourceForHeaderFromFramework(header) {
  const frameworkStructure = getFrameworkStructureFromHeaderDir(_nuclideUri().default.dirname(header));

  if (frameworkStructure == null) {
    return null;
  }

  const {
    frameworkPath,
    frameworkSubFolder
  } = frameworkStructure;
  return (0, _common().searchFileWithBasename)(_nuclideUri().default.join(frameworkPath, 'Sources', frameworkSubFolder), (0, _utils().getFileBasename)(header), _utils().isSourceFile);
}