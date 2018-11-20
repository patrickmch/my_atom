"use strict";

function _Dispatcher() {
  const data = _interopRequireDefault(require("../Dispatcher"));

  _Dispatcher = function () {
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
 *  strict
 * @format
 * @emails oncall+nuclide
 */

/**
 * Originally from https://github.com/facebook/flux/blob/55480fb/src/Dispatcher.js
 */
describe('Dispatcher', () => {
  let dispatcher;
  let callbackA;
  let callbackB;
  beforeEach(() => {
    dispatcher = new (_Dispatcher().default)();
    callbackA = jest.fn();
    callbackB = jest.fn();
  });
  it('should execute all subscriber callbacks', () => {
    dispatcher.register(callbackA);
    dispatcher.register(callbackB);
    const payload = {};
    dispatcher.dispatch(payload);
    expect(callbackA.mock.calls.length).toBe(1);
    expect(callbackA.mock.calls[0][0]).toBe(payload);
    expect(callbackB.mock.calls.length).toBe(1);
    expect(callbackB.mock.calls[0][0]).toBe(payload);
    dispatcher.dispatch(payload);
    expect(callbackA.mock.calls.length).toBe(2);
    expect(callbackA.mock.calls[1][0]).toBe(payload);
    expect(callbackB.mock.calls.length).toBe(2);
    expect(callbackB.mock.calls[1][0]).toBe(payload);
  });
  it('should wait for callbacks registered earlier', () => {
    const tokenA = dispatcher.register(callbackA);
    dispatcher.register(payload => {
      dispatcher.waitFor([tokenA]);
      expect(callbackA.mock.calls.length).toBe(1);
      expect(callbackA.mock.calls[0][0]).toBe(payload);
      callbackB(payload);
    });
    const payload = {};
    dispatcher.dispatch(payload);
    expect(callbackA.mock.calls.length).toBe(1);
    expect(callbackA.mock.calls[0][0]).toBe(payload);
    expect(callbackB.mock.calls.length).toBe(1);
    expect(callbackB.mock.calls[0][0]).toBe(payload);
  });
  it('should wait for callbacks registered later', () => {
    dispatcher.register(payload => {
      dispatcher.waitFor([tokenB]);
      expect(callbackB.mock.calls.length).toBe(1);
      expect(callbackB.mock.calls[0][0]).toBe(payload);
      callbackA(payload);
    });
    const tokenB = dispatcher.register(callbackB);
    const payload = {};
    dispatcher.dispatch(payload);
    expect(callbackA.mock.calls.length).toBe(1);
    expect(callbackA.mock.calls[0][0]).toBe(payload);
    expect(callbackB.mock.calls.length).toBe(1);
    expect(callbackB.mock.calls[0][0]).toBe(payload);
  });
  it('should throw if dispatch() while dispatching', () => {
    dispatcher.register(payload => {
      dispatcher.dispatch(payload);
      callbackA();
    });
    const payload = {};
    expect(() => dispatcher.dispatch(payload)).toThrow();
    expect(callbackA.mock.calls.length).toBe(0);
  });
  it('should throw if waitFor() while not dispatching', () => {
    const tokenA = dispatcher.register(callbackA);
    expect(() => dispatcher.waitFor([tokenA])).toThrow();
    expect(callbackA.mock.calls.length).toBe(0);
  });
  it('should throw if waitFor() with invalid token', () => {
    const invalidToken = 1337;
    dispatcher.register(() => {
      // $FlowIgnore: Purposefully invalid token.
      dispatcher.waitFor([invalidToken]);
    });
    const payload = {};
    expect(() => dispatcher.dispatch(payload)).toThrow();
  });
  it('should throw on self-circular dependencies', () => {
    const tokenA = dispatcher.register(payload => {
      dispatcher.waitFor([tokenA]);
      callbackA(payload);
    });
    const payload = {};
    expect(() => dispatcher.dispatch(payload)).toThrow();
    expect(callbackA.mock.calls.length).toBe(0);
  });
  it('should throw on multi-circular dependencies', () => {
    const tokenA = dispatcher.register(payload => {
      dispatcher.waitFor([tokenB]);
      callbackA(payload);
    });
    const tokenB = dispatcher.register(payload => {
      dispatcher.waitFor([tokenA]);
      callbackB(payload);
    });
    expect(() => dispatcher.dispatch({})).toThrow();
    expect(callbackA.mock.calls.length).toBe(0);
    expect(callbackB.mock.calls.length).toBe(0);
  });
  it('should remain in a consistent state after a failed dispatch', () => {
    dispatcher.register(callbackA);
    dispatcher.register(payload => {
      if (payload.shouldThrow) {
        throw new Error();
      }

      callbackB();
    });
    expect(() => dispatcher.dispatch({
      shouldThrow: true
    })).toThrow(); // Cannot make assumptions about a failed dispatch.

    const callbackACount = callbackA.mock.calls.length;
    dispatcher.dispatch({
      shouldThrow: false
    });
    expect(callbackA.mock.calls.length).toBe(callbackACount + 1);
    expect(callbackB.mock.calls.length).toBe(1);
  });
  it('should properly unregister callbacks', () => {
    dispatcher.register(callbackA);
    const tokenB = dispatcher.register(callbackB);
    const payload = {};
    dispatcher.dispatch(payload);
    expect(callbackA.mock.calls.length).toBe(1);
    expect(callbackA.mock.calls[0][0]).toBe(payload);
    expect(callbackB.mock.calls.length).toBe(1);
    expect(callbackB.mock.calls[0][0]).toBe(payload);
    dispatcher.unregister(tokenB);
    dispatcher.dispatch(payload);
    expect(callbackA.mock.calls.length).toBe(2);
    expect(callbackA.mock.calls[1][0]).toBe(payload);
    expect(callbackB.mock.calls.length).toBe(1);
  });
  it('should throw if register() while dispatching', () => {
    dispatcher.register(payload => {
      dispatcher.register(callbackB);
      callbackA();
    });
    const payload = {};
    expect(() => dispatcher.dispatch(payload)).toThrow();
    expect(callbackA.mock.calls.length).toBe(0);
  });
  it('should throw if unregister() while dispatching', () => {
    const tokenA = dispatcher.register(callbackA);
    dispatcher.register(payload => {
      dispatcher.unregister(tokenA);
      callbackB();
    });
    const payload = {};
    expect(() => dispatcher.dispatch(payload)).toThrow();
    expect(callbackA.mock.calls.length).toBe(1);
    expect(callbackB.mock.calls.length).toBe(0);
  });
});