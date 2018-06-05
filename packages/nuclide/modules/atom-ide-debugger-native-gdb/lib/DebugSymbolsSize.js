'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.debugSymSizeByProcess = debugSymSizeByProcess;
exports.debugSymSizeByBinary = debugSymSizeByBinary;

var _fsPromise;

function _load_fsPromise() {
  return _fsPromise = _interopRequireDefault(require('../../nuclide-commons/fsPromise'));
}

var _process;

function _load_process() {
  return _process = require('../../nuclide-commons/process');
}

var _rxjsBundlesRxMinJs = require('rxjs/bundles/Rx.min.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function debugSymSizeByProcess(pid) {
  // Only support Linux for now. readelf is part of binutils and should be
  // on every Linux distro that has any dev tools installed.
  if (process.platform !== 'linux') {
    return null;
  }

  // If we have the /proc file system, we can get the executable trivially
  const procExe = `/proc/${pid}/exe`;
  if (await (_fsPromise || _load_fsPromise()).default.exists(procExe)) {
    return debugSymSizeByBinary(procExe);
  }

  // If /proc isn't available, we could do some ugly parsing of ps here.
  return null;
} /**
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

async function debugSymSizeByBinary(binary) {
  // this pipeline parses the output of readelf to find debug sections.
  // readelf -WS lists the various sections in the format
  //   [Nr] Name              Type            Address          Off    Size   ES Flg Lk Inf Al
  //   [ 0]                   NULL            0000000000000000 000000 000000 00      0   0  0
  //   [ 1] .interp           PROGBITS        0000000000400238 000238 00001c 00   A  0   0  1
  //
  // The debug sections are named .debug* for DWARF or .stab* for stabs.
  //
  const NAME_COLUMN = 1;
  const SIZE_COLUMN = 5;
  return new Promise((resolve, reject) => {
    try {
      (0, (_process || _load_process()).runCommand)('readelf', ['-WS', binary]).catch(_ => _rxjsBundlesRxMinJs.Observable.of('')).map(stdout => stdout.split(/\n/)
      // filter out just the section lines on [##]
      .filter(line => /\[\s*\d+\]/.test(line))
      // Remove spaces from the single-digit section indices, so we can
      // safely split on spaces (i.e. '[ 1]' becomes '[1]')
      .map(line => line.replace(/\[\s*(\d+)\]/, '[$1]').trim().split(/\s+/)).filter(tuple => /(debug|stab)/.test(tuple[NAME_COLUMN])).reduce((sum, tuple) => sum + parseInt(tuple[SIZE_COLUMN], 16), 0)).subscribe(value => resolve(value));
    } catch (ex) {
      reject(ex);
    }
  });
}