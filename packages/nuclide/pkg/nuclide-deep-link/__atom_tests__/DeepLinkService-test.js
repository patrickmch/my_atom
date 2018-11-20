"use strict";

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
    return data;
  };

  return data;
}

var _electron = _interopRequireDefault(require("electron"));

function _nullthrows() {
  const data = _interopRequireDefault(require("nullthrows"));

  _nullthrows = function () {
    return data;
  };

  return data;
}

function _DeepLinkService() {
  const data = _interopRequireDefault(require("../lib/DeepLinkService"));

  _DeepLinkService = function () {
    return data;
  };

  return data;
}

function _waits_for() {
  const data = _interopRequireDefault(require("../../../jest/waits_for"));

  _waits_for = function () {
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
 * @emails oncall+nuclide
 */
const remote = (0, _nullthrows().default)(_electron.default.remote);
describe('DeepLinkService', () => {
  it('allows subscriptions to messages', async () => {
    const service = new (_DeepLinkService().default)();
    const testSpy1 = jest.fn();
    const testSpy11 = jest.fn();
    const testSpy2 = jest.fn(); // Make sure multiple subscriptions go through.

    const disposables = new (_UniversalDisposable().default)(service.subscribeToPath('test1', testSpy1), service.subscribeToPath('test1', testSpy11), service.subscribeToPath('test2', testSpy2));
    const browserWindow = remote.getCurrentWindow();
    service.sendDeepLink(browserWindow, 'test1', {
      a: '1'
    });
    service.sendDeepLink(browserWindow, 'test2/', {
      b: '2'
    });
    await (0, _waits_for().default)(() => testSpy1.mock.calls.length > 0);
    expect(testSpy1).toHaveBeenCalledWith({
      a: '1'
    });
    expect(testSpy11).toHaveBeenCalledWith({
      a: '1'
    });
    expect(testSpy2).toHaveBeenCalledWith({
      b: '2'
    }); // Make sure observers get cleaned up.

    disposables.dispose();
    expect(service._observers.size).toBe(0);
    service.dispose();
  });
  it('opens target=_blank links in a new window', async () => {
    const service = new (_DeepLinkService().default)();
    const windows = remote.BrowserWindow.getAllWindows();
    const browserWindow = remote.getCurrentWindow(); // Opening a modal marks the window as non-blank.

    const panel = atom.workspace.addModalPanel({
      item: document.createElement('div')
    });
    service.sendDeepLink(browserWindow, 'test1', {
      a: '1',
      target: '_blank'
    });
    await (0, _waits_for().default)(() => remote.BrowserWindow.getAllWindows().length > windows.length, 'new window to open'); // Ideally we'd also check that the URL made it through.. but that's too difficult.

    service.dispose();
    panel.destroy();
  });
});