'use strict';

var _RPCProcess = require('@jest-runner/rpc/RPCProcess');
var _RPCProcess2 = _interopRequireDefault(_RPCProcess);
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * ****************************************************
 * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!
 * ****************************************************
 *
 * @generated c98e0eea63c67fda1d3edf6cf1c6610e
 */ class NuclideE2ERPCProcess extends _RPCProcess2.default {
  initializeRemote() {
    return {
      runTest: this.jsonRPCCall.bind(this, 'runTest'),
      shutDown: this.jsonRPCCall.bind(this, 'shutDown')
    };
  }
}

module.exports = NuclideE2ERPCProcess;
