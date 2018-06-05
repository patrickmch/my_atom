'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isHeaderFile = isHeaderFile;
exports.isSourceFile = isSourceFile;
exports.commonPrefix = commonPrefix;
exports.guessBuildFile = guessBuildFile;
exports.isBuckBuildFile = isBuckBuildFile;
exports.getFileBasename = getFileBasename;

var _nuclideUri;

function _load_nuclideUri() {
  return _nuclideUri = _interopRequireDefault(require('../../../modules/nuclide-commons/nuclideUri'));
}

var _fsPromise;

function _load_fsPromise() {
  return _fsPromise = _interopRequireDefault(require('../../../modules/nuclide-commons/fsPromise'));
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

const HEADER_EXTENSIONS = new Set(['.h', '.hh', '.hpp', '.hxx', '.h++']);
const SOURCE_EXTENSIONS = new Set(['.c', '.cc', '.cpp', '.cxx', '.c++', '.m', '.mm']);

function isHeaderFile(filename) {
  return HEADER_EXTENSIONS.has((_nuclideUri || _load_nuclideUri()).default.extname(filename));
}

function isSourceFile(filename) {
  return SOURCE_EXTENSIONS.has((_nuclideUri || _load_nuclideUri()).default.extname(filename));
}

function commonPrefix(a, b) {
  let len = 0;
  while (len < a.length && len < b.length && a[len] === b[len]) {
    len++;
  }
  return len;
}

const BUCK_BUILD_FILES = ['BUCK', 'TARGETS'];

// The file may be new. Look for a nearby BUCK or TARGETS file.
async function guessBuildFile(file) {
  const dir = (_nuclideUri || _load_nuclideUri()).default.dirname(file);
  let bestMatch = null;
  await Promise.all([...BUCK_BUILD_FILES, 'compile_commands.json'].map(async name => {
    const nearestDir = await (_fsPromise || _load_fsPromise()).default.findNearestFile(name, dir);
    if (nearestDir != null) {
      const match = (_nuclideUri || _load_nuclideUri()).default.join(nearestDir, name);
      // Return the closest (most specific) match.
      if (bestMatch == null || match.length > bestMatch.length) {
        bestMatch = match;
      }
    }
  }));
  return bestMatch;
}

function isBuckBuildFile(buildFile) {
  return BUCK_BUILD_FILES.includes((_nuclideUri || _load_nuclideUri()).default.basename(buildFile));
}

// Strip off the extension and conventional suffixes like "Internal" and "-inl".
function getFileBasename(file) {
  let basename = (_nuclideUri || _load_nuclideUri()).default.basename(file);
  const ext = basename.lastIndexOf('.');
  if (ext !== -1) {
    basename = basename.substr(0, ext);
  }
  return basename.replace(/(Internal|-inl)$/, '');
}