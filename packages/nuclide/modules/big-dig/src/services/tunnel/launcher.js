'use strict';

var _TunnelManager;

function _load_TunnelManager() {
  return _TunnelManager = require('./TunnelManager');
}

var _log4js;

function _load_log4js() {
  return _log4js = require('log4js');
}

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

const logger = (0, (_log4js || _load_log4js()).getLogger)('tunnel-service');

// eslint-disable-next-line nuclide-internal/no-commonjs
module.exports = function launch(launcherParams) {
  const { server } = launcherParams;
  logger.info('adding tunnel subscriber!');

  server.addSubscriber('tunnel', {
    onConnection(transport) {
      logger.info('connection made, creating TunnelManager');
      // eslint-disable-next-line no-unused-vars
      const tunnelManager = new (_TunnelManager || _load_TunnelManager()).TunnelManager(transport); // when do we close this?
    }
  });

  return Promise.resolve();
};