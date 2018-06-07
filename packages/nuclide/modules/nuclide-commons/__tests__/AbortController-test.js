'use strict';

var _AbortController;

function _load_AbortController() {
  return _AbortController = _interopRequireDefault(require('../AbortController'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('AbortController', () => {
  it('dispatches abort() events', () => {
    const controller = new (_AbortController || _load_AbortController()).default();
    expect(controller.signal.aborted).toBe(false);

    const spy = jest.fn();
    controller.signal.onabort = spy;

    controller.abort();

    expect(controller.signal.aborted).toBe(true);
    expect(spy).toHaveBeenCalled();

    // Ensure that we don't double-abort.
    controller.abort();
    expect(spy.mock.calls.length).toBe(1);
  });

  it('dispatches abort() events via addEventListener', () => {
    const controller = new (_AbortController || _load_AbortController()).default();
    const spy = jest.fn();
    controller.signal.addEventListener('abort', spy);

    controller.abort();

    expect(controller.signal.aborted).toBe(true);
    expect(spy).toHaveBeenCalled();
  });
}); /**
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