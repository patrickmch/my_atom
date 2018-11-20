"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createBuckWebSocket;

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _log4js() {
  const data = require("log4js");

  _log4js = function () {
    return data;
  };

  return data;
}

function _ws() {
  const data = _interopRequireDefault(require("ws"));

  _ws = function () {
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
 *  strict-local
 * @format
 */
function createBuckWebSocket(httpPort) {
  return _rxjsCompatUmdMin.Observable.create(observer => {
    const uri = `ws://localhost:${httpPort}/ws/build`;
    const socket = new (_ws().default)(uri);
    socket.on('open', () => {
      // Emit a message so the client knows the socket is ready for Buck events.
      observer.next({
        type: 'SocketConnected'
      });
    });
    socket.on('message', data => {
      let message;

      try {
        message = JSON.parse(data);
      } catch (err) {
        (0, _log4js().getLogger)('nuclide-buck-rpc').error('Error parsing Buck websocket message', err);
        return;
      }

      observer.next(message);
    });
    socket.on('error', e => {
      observer.error(e);
    });
    socket.on('close', () => {
      observer.complete();
    });
    return () => {
      socket.removeAllListeners();
      socket.close();
    };
  });
}