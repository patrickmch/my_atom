"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.XhrConnectionHeartbeat = void 0;

function _asyncRequest() {
  const data = _interopRequireDefault(require("./utils/asyncRequest"));

  _asyncRequest = function () {
    return data;
  };

  return data;
}

function _eventKit() {
  const data = require("event-kit");

  _eventKit = function () {
    return data;
  };

  return data;
}

function _log4js() {
  const data = require("log4js");

  _log4js = function () {
    return data;
  };

  return data;
}

function _promise() {
  const data = require("../../../nuclide-commons/promise");

  _promise = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
const HEARTBEAT_INTERVAL_MS = 10000;
const HEARTBEAT_TIMEOUT_MS = 10000;
const MAX_HEARTBEAT_AWAY_RECONNECT_MS = 60000;
const RETRY_DELAY = 3000;
const MAX_RETRY_COUNT = 4;
const ECONNRESET_ERRORS_IN_ROW_LIMIT = 4;
const logger = (0, _log4js().getLogger)('XhrConnectionHeartbeat');

class XhrConnectionHeartbeat {
  constructor(serverUri, heartbeatChannel, agentOptions) {
    this._heartbeatConnectedOnce = false;
    this._lastHeartbeat = null;
    this._lastHeartbeatTime = null;
    this._connectionResetCount = 0;
    const options = {
      uri: `${serverUri}/${heartbeatChannel}`,
      method: 'POST',
      timeout: HEARTBEAT_TIMEOUT_MS,
      // We're trying this to see if it resolves T28442202
      forever: true
    };

    if (agentOptions != null) {
      options.agentOptions = agentOptions;
    }

    this._options = options;
    this._emitter = new (_eventKit().Emitter)();

    this._monitorServerHeartbeat();
  }

  _monitorServerHeartbeat() {
    this._heartbeat();

    this._heartbeatInterval = setInterval(() => this._heartbeat(), HEARTBEAT_INTERVAL_MS);
  }

  _restartHeartbeatIfNecessary() {
    if (this._heartbeatInterval == null && this._heartbeatConnectedOnce) {
      logger.warn('restarting heartbeat interval');

      this._monitorServerHeartbeat();
    }
  }

  _disableHeartbeatIfNecessary() {
    if (this._heartbeatInterval != null) {
      clearInterval(this._heartbeatInterval);
      logger.warn('stopped heartbeats while retrying');
      this._heartbeatInterval = null;
    }
  } // Returns version


  async sendHeartBeat() {
    let retries = MAX_RETRY_COUNT;

    while (true) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const {
          body
        } = await (0, _asyncRequest().default)(this._options);

        this._restartHeartbeatIfNecessary();

        return body;
      } catch (err) {
        if (retries-- > 0 && (err.code === 'CERT_NOT_YET_VALID' || this._heartbeatConnectedOnce && err.code === 'ECONNREFUSED')) {
          this._disableHeartbeatIfNecessary();

          logger.warn(`${err.code}, retrying ${retries} more times after ${RETRY_DELAY}ms...`); // TODO: (semmy) exponential backoff would be more effective
          // eslint-disable-next-line no-await-in-loop

          await (0, _promise().sleep)(RETRY_DELAY);
        } else {
          this._restartHeartbeatIfNecessary();

          throw err;
        }
      }
    } // eslint-disable-next-line no-unreachable


    throw new Error('unreachable');
  }

  async _heartbeat() {
    try {
      await this.sendHeartBeat();
      this._heartbeatConnectedOnce = true;
      const now = Date.now(); // flowlint-next-line sketchy-null-number:off

      this._lastHeartbeatTime = this._lastHeartbeatTime || now;

      if (this._lastHeartbeat === 'away' || now - this._lastHeartbeatTime > MAX_HEARTBEAT_AWAY_RECONNECT_MS) {
        // Trigger a websocket reconnect.
        this._emitter.emit('reconnect');
      }

      this._lastHeartbeat = 'here';
      this._lastHeartbeatTime = now;
      this._connectionResetCount = 0;

      this._emitter.emit('heartbeat');
    } catch (err) {
      this._lastHeartbeat = 'away'; // Error code could could be one of:
      // ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT']
      // A heuristic mapping is done between the xhr error code to the state of server connection.

      const {
        code: originalCode,
        message
      } = err;
      let code = null;

      switch (originalCode) {
        case 'ENOTFOUND': // A socket operation failed because the network was down.
        // falls through

        case 'ENETDOWN': // The range of the temporary ports for connection are all taken,
        // This is temporal with many http requests, but should be counted as a network away event.
        // falls through

        case 'EADDRNOTAVAIL': // The host server is unreachable, could be in a VPN.
        // falls through

        case 'EHOSTUNREACH': // The network is unreachable.
        // falls through

        case 'ENETUNREACH': // Resource temporarly unavailable
        // falls through

        case 'EAGAIN': // The pathname in the remote address specified to connect did not exist.
        // (seems to be an internal Node error)
        // falls through

        case 'ENOENT': // Software caused connection abort
        // (seems to be an internal Node error and recoverable P59856025)
        // falls through

        case 'ECONNABORTED': // Operation canceled; an asynchronous operation was canceled before it completed.
        // (seems to be an internal Node error)
        // falls through

        case 'ECANCELED': // A request timeout is considered a network away event.
        // falls through

        case 'ETIMEDOUT':
        case 'ESOCKETTIMEDOUT':
          code = 'NETWORK_AWAY';
          break;

        case 'ECONNREFUSED':
          // Server shut down or port no longer accessible.
          if (this._heartbeatConnectedOnce) {
            code = 'SERVER_CRASHED';
          } else {
            code = 'PORT_NOT_ACCESSIBLE';
          }

          break;

        case 'ECONNRESET':
          code = this._checkReconnectErrorType(originalCode);
          break;

        case 'CERT_HAS_EXPIRED':
          code = 'INVALID_CERTIFICATE';
          break;

        case 'CERT_SIGNATURE_FAILURE':
          code = 'CERT_SIGNATURE_FAILURE';
          break;

        default:
          code = originalCode;
          break;
      }

      if (code !== 'ECONNRESET') {
        this._connectionResetCount = 0;
      }

      this._emitter.emit('heartbeat.error', {
        code,
        originalCode,
        message
      });
    }
  }

  _checkReconnectErrorType(originalCode) {
    this._connectionResetCount++;

    if (this._connectionResetCount >= ECONNRESET_ERRORS_IN_ROW_LIMIT) {
      return 'INVALID_CERTIFICATE';
    }

    return originalCode;
  }

  onHeartbeat(callback) {
    return this._emitter.on('heartbeat', callback);
  }

  onHeartbeatError(callback) {
    return this._emitter.on('heartbeat.error', callback);
  }

  onConnectionRestored(callback) {
    return this._emitter.on('reconnect', callback);
  }

  isAway() {
    return this._lastHeartbeat === 'away';
  }

  close() {
    if (this._heartbeatInterval != null) {
      clearInterval(this._heartbeatInterval);
    }
  }

}

exports.XhrConnectionHeartbeat = XhrConnectionHeartbeat;