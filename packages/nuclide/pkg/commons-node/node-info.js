'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getNodeBinaryPath = getNodeBinaryPath;
async function getNodeBinaryPath(path) {
  try {
    // $FlowFB
    return require('./fb-node-info').getNodeBinaryPath(path);
  } catch (error) {
    return 'node';
  }
} /**
   * Copyright (c) 2015-present, Facebook, Inc.
   * All rights reserved.
   *
   * This source code is licensed under the license found in the LICENSE file in
   * the root directory of this source tree.
   *
   * 
   * @format
   */