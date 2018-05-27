'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _asyncToGenerator = _interopRequireDefault(require('async-to-generator'));var _BigDigServer;











function _load_BigDigServer() {return _BigDigServer = require('../server/BigDigServer');}var _BigDigClient;
function _load_BigDigClient() {return _BigDigClient = require('./BigDigClient');}var _ReliableSocket;
function _load_ReliableSocket() {return _ReliableSocket = require('../socket/ReliableSocket');}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}











/**
                                                                                                                                                                                              * Creates a Big Dig client that speaks the v1 protocol.
                                                                                                                                                                                              */exports.default = (() => {var _ref = (0, _asyncToGenerator.default)(
  function* (
  config)
  {
    const reliableSocket = createReliableSocket(config);
    const client = new (_BigDigClient || _load_BigDigClient()).BigDigClient(reliableSocket);
    try {
      // Make sure we're able to make the initial connection
      yield reliableSocket.testConnection();
      return client;
    } catch (error) {
      client.close();
      throw error;
    }
  });function createBigDigClient(_x) {return _ref.apply(this, arguments);}return createBigDigClient;})(); /**
                                                                                                           * Copyright (c) 2017-present, Facebook, Inc.
                                                                                                           * All rights reserved.
                                                                                                           *
                                                                                                           * This source code is licensed under the BSD-style license found in the
                                                                                                           * LICENSE file in the root directory of this source tree. An additional grant
                                                                                                           * of patent rights can be found in the PATENTS file in the same directory.
                                                                                                           *
                                                                                                           *  strict-local
                                                                                                           * @format
                                                                                                           */function createReliableSocket(config) {const options = { ca: config.certificateAuthorityCertificate, cert: config.clientCertificate, key: config.clientKey, family: config.family };const serverUri = `https://${config.host}:${config.port}/v1`;

  const reliableSocket = new (_ReliableSocket || _load_ReliableSocket()).ReliableSocket(
  serverUri, (_BigDigServer || _load_BigDigServer()).HEARTBEAT_CHANNEL,

  options);


  if (!config.ignoreIntransientErrors) {
    reliableSocket.onIntransientError(error => reliableSocket.close());
  }

  return reliableSocket;
}