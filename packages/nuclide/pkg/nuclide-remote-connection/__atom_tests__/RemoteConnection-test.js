'use strict';

var _fs = _interopRequireDefault(require('fs'));

var _RemoteConnection;

function _load_RemoteConnection() {
  return _RemoteConnection = require('../lib/RemoteConnection');
}

var _ServerConnection;

function _load_ServerConnection() {
  return _ServerConnection = require('../lib/ServerConnection');
}

var _nuclideUri;

function _load_nuclideUri() {
  return _nuclideUri = _interopRequireDefault(require('../../../modules/nuclide-commons/nuclideUri'));
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

const pathToFakePk = (_nuclideUri || _load_nuclideUri()).default.join(__dirname, 'fakepk');

describe('RemoteConnection', () => {
  const testConnections = (_ServerConnection || _load_ServerConnection()).__test__.connections;
  let testConnection;
  const testHostname = 'foo.nuclide.com';
  const testPath = '/home/foo/test';

  beforeEach(() => {
    _fs.default.writeFileSync(pathToFakePk, '');
    const server = new (_ServerConnection || _load_ServerConnection()).ServerConnection({
      host: testHostname,
      port: 8192
    });
    testConnections.set(testHostname, server);
    testConnection = new (_RemoteConnection || _load_RemoteConnection()).RemoteConnection(server, testPath, '', true);
    server.addConnection(testConnection);
  });

  afterEach(() => {
    testConnections.delete(testHostname);
    if (_fs.default.existsSync(pathToFakePk)) {
      _fs.default.unlink(pathToFakePk);
    }
  });

  describe('getByHostnameAndPath()', () => {
    it('gets a connection if the hostname and path matches', () => {
      const conn = (_RemoteConnection || _load_RemoteConnection()).RemoteConnection.getByHostnameAndPath(testHostname, testPath);
      expect(conn).toBe(testConnection);
    });

    it('returns undefined if the path is not matching', () => {
      const conn = (_RemoteConnection || _load_RemoteConnection()).RemoteConnection.getByHostnameAndPath(testHostname, '/home/bar/test');
      expect(conn).toBeUndefined();
    });

    it('returns undefined if the hostname is not matching', () => {
      const conn = (_RemoteConnection || _load_RemoteConnection()).RemoteConnection.getByHostnameAndPath('bar.nuclide.com', testPath);
      expect(conn).toBeUndefined();
    });

    it('returns a connection if given a file path deep into the directory path', () => {
      const conn = (_RemoteConnection || _load_RemoteConnection()).RemoteConnection.getByHostnameAndPath(testHostname, testPath + '/def/abc.txt');
      expect(conn).toBe(testConnection);
    });
  });

  describe('getForUri()', () => {
    it('gets a connection if the hostname and path matches', () => {
      const conn = (_RemoteConnection || _load_RemoteConnection()).RemoteConnection.getForUri(`nuclide://${testHostname}${testPath}`);
      expect(conn).toBe(testConnection);
    });

    it('returns undefined if the path is not matching', () => {
      const conn = (_RemoteConnection || _load_RemoteConnection()).RemoteConnection.getForUri(`nuclide://${testHostname}$/home/bar/test`);
      expect(conn).toBeUndefined();
    });

    it('returns undefined if the hostname is not matching', () => {
      const conn = (_RemoteConnection || _load_RemoteConnection()).RemoteConnection.getForUri(`nuclide://bar.nuclide.com${testPath}`);
      expect(conn).toBeUndefined();
    });

    it('returns a connection if given a file path deep into the directory path', () => {
      const conn = (_RemoteConnection || _load_RemoteConnection()).RemoteConnection.getForUri(`nuclide://${testHostname}${testPath}/def/abc.txt`);
      expect(conn).toBe(testConnection);
    });
  });
});