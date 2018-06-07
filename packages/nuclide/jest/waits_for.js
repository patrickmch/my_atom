'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 *  strict
 * @format
 */

/*
 * Async implementation of Jasmine's waitsFor()
 */
exports.default = async function waitsFor(fn, message, timeout = 1000) {
  const error = new Error(message != null ? message : 'Expected the function to start returning "true" but it never did');
  const startTime = Date.now();
  while (!Boolean(fn())) {
    if (Date.now() - startTime > timeout) {
      throw error;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};