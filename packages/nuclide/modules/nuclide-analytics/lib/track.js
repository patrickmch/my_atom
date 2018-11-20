"use strict";

/**
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

/* eslint-disable nuclide-internal/no-commonjs */
// This extra module enables adding spies during testing.
try {
  // $FlowFB
  module.exports = require("../fb/analytics");
} catch (e) {
  module.exports = require("./analytics");
}