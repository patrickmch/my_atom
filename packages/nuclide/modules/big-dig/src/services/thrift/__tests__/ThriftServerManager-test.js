"use strict";

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _jest_mock_utils() {
  const data = require("../../../../../../jest/jest_mock_utils");

  _jest_mock_utils = function () {
    return data;
  };

  return data;
}

function _ThriftServerManager() {
  const data = require("../ThriftServerManager");

  _ThriftServerManager = function () {
    return data;
  };

  return data;
}

function _createThriftServer() {
  const data = require("../createThriftServer");

  _createThriftServer = function () {
    return data;
  };

  return data;
}

function _util() {
  const data = require("../util");

  _util = function () {
    return data;
  };

  return data;
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
 * @emails oncall+nuclide
 */
jest.mock(require.resolve("../createThriftServer"));
describe('ThriftServerManager', () => {
  let mockedTransport;
  let serverMessage;
  let clientMessage;
  const mockPort = 9000;
  const serverConfig = {
    name: 'thrift-rfs',
    remoteCommand: '',
    remoteCommandArgs: [],
    remoteConnection: {
      type: 'tcp',
      port: mockPort
    },
    killOldThriftServerProcess: true
  };
  const startServerMessage = {
    id: '1',
    payload: {
      type: 'request',
      command: 'start-server',
      serverConfig
    }
  };
  let mockCloseServerFn;
  let mockGetPortFn;
  beforeEach(() => {
    class MockedTransport {
      onMessage() {
        // Do not use Observable.of(message) here, which will immediately fire
        // event, use Subject() instead so that we have more controls on it.
        return clientMessage;
      }

      send(message) {
        serverMessage.next(message);
      }

    }

    mockCloseServerFn = jest.fn();
    mockGetPortFn = jest.fn().mockReturnValue({
      port: mockPort,
      useIPv4: false
    });
    (0, _jest_mock_utils().getMock)(_createThriftServer().createThriftServer).mockImplementation(() => {
      return {
        getConnectionOptions: mockGetPortFn,
        close: mockCloseServerFn
      };
    });
    serverMessage = new _rxjsCompatUmdMin.Subject();
    clientMessage = new _rxjsCompatUmdMin.Subject();
    mockedTransport = new MockedTransport(); // eslint-disable-next-line no-new

    new (_ThriftServerManager().ThriftServerManager)(mockedTransport);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  it('successfully start server', async () => {
    const expectedResponse = {
      id: '1',
      payload: {
        type: 'response',
        success: true,
        connectionOptions: {
          port: mockPort,
          useIPv4: false
        }
      }
    };
    const responsePromise = serverMessage.take(1).toPromise();
    clientMessage.next((0, _util().encodeMessage)(startServerMessage));
    const response = (0, _util().decodeMessage)((await responsePromise));
    expect(response).toEqual(expectedResponse);
  });
  it('responses fail for malformatted message', async () => {
    const malformattedMessage = {
      id: '1'
    };
    const expectedResponse = {
      id: '1',
      payload: {
        type: 'response',
        success: false,
        error: 'Malformatted request message!'
      }
    };
    const responsePromise = serverMessage.take(1).toPromise();
    clientMessage.next(JSON.stringify(malformattedMessage));
    const response = (0, _util().decodeMessage)((await responsePromise));
    expect(response).toEqual(expectedResponse);
  });
  it('responses fail for malformatted message payload', async () => {
    const malformattedMessage = {
      id: '1',
      payload: {
        type: 'request'
      }
    };
    const expectedResponse = {
      id: '1',
      payload: {
        type: 'response',
        success: false,
        error: 'Malformatted request message!'
      }
    };
    const responsePromise = serverMessage.take(1).toPromise();
    clientMessage.next(JSON.stringify(malformattedMessage));
    const response = (0, _util().decodeMessage)((await responsePromise));
    expect(response).toEqual(expectedResponse);
  });
  it('responses fail when server failed to start', async () => {
    const expectedResponse = {
      id: '1',
      payload: {
        type: 'response',
        success: false,
        error: 'Failed to create server'
      }
    };
    (0, _jest_mock_utils().getMock)(_createThriftServer().createThriftServer).mockImplementation(() => {
      throw new Error('mocked error');
    });
    const responsePromise = serverMessage.take(1).toPromise();
    clientMessage.next((0, _util().encodeMessage)(startServerMessage));
    const response = (0, _util().decodeMessage)((await responsePromise));
    expect(response).toEqual(expectedResponse);
  });
  it('successfully close server', async () => {
    const closeServerMessage = {
      id: '2',
      payload: {
        type: 'request',
        command: 'stop-server',
        serverConfig
      }
    };
    const expectedResponse = {
      id: '2',
      payload: {
        type: 'response',
        success: true
      }
    };
    const firstResponsePromise = serverMessage.take(1).toPromise();
    clientMessage.next((0, _util().encodeMessage)(startServerMessage));
    await firstResponsePromise;
    const secondResponsePromise = serverMessage.take(1).toPromise();
    clientMessage.next((0, _util().encodeMessage)(closeServerMessage));
    const response = (0, _util().decodeMessage)((await secondResponsePromise));
    expect(response).toEqual(expectedResponse);
    expect(mockCloseServerFn).toHaveBeenCalled();
  });
  it('reuse existing server', async () => {
    const firstStartServerMessage = {
      id: '1',
      payload: {
        type: 'request',
        command: 'start-server',
        serverConfig
      }
    };
    const firstResponsePromise = serverMessage.take(1).toPromise();
    clientMessage.next((0, _util().encodeMessage)(firstStartServerMessage));
    await firstResponsePromise;
    const secondStartServerMessage = {
      id: '2',
      payload: {
        type: 'request',
        command: 'start-server',
        serverConfig
      }
    };
    const expectedSecondResponse = {
      id: '2',
      payload: {
        type: 'response',
        success: true,
        connectionOptions: {
          port: mockPort,
          useIPv4: false
        }
      }
    };
    const secondResponsePromise = serverMessage.take(1).toPromise();
    clientMessage.next((0, _util().encodeMessage)(secondStartServerMessage));
    const secondResponse = (0, _util().decodeMessage)((await secondResponsePromise));
    expect(secondResponse).toEqual(expectedSecondResponse);
    expect(_createThriftServer().createThriftServer).toHaveBeenCalledTimes(1);
    const firstStopServerMessage = {
      id: '3',
      payload: {
        type: 'request',
        command: 'stop-server',
        serverConfig
      }
    };
    const expectedThirdResponse = {
      id: '3',
      payload: {
        type: 'response',
        success: true
      }
    };
    const thirdResponsePromise = serverMessage.take(1).toPromise();
    clientMessage.next((0, _util().encodeMessage)(firstStopServerMessage));
    const thirdResponse = (0, _util().decodeMessage)((await thirdResponsePromise));
    expect(thirdResponse).toEqual(expectedThirdResponse);
    expect(mockCloseServerFn).not.toHaveBeenCalled();
    const secondStopServerMessage = {
      id: '4',
      payload: {
        type: 'request',
        command: 'stop-server',
        serverConfig
      }
    };
    const expectedFourthResponse = {
      id: '4',
      payload: {
        type: 'response',
        success: true
      }
    };
    const fourthResponsePromise = serverMessage.take(1).toPromise();
    clientMessage.next((0, _util().encodeMessage)(secondStopServerMessage));
    const fourthResponse = (0, _util().decodeMessage)((await fourthResponsePromise));
    expect(fourthResponse).toEqual(expectedFourthResponse);
    expect(mockCloseServerFn).toHaveBeenCalled();
  });
});