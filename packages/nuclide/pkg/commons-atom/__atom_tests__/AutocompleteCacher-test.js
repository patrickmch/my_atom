"use strict";

var _atom = require("atom");

function _promise() {
  const data = require("../../../modules/nuclide-commons/promise");

  _promise = function () {
    return data;
  };

  return data;
}

function _AutocompleteCacher() {
  const data = _interopRequireDefault(require("../AutocompleteCacher"));

  _AutocompleteCacher = function () {
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
 * 
 * @format
 * @emails oncall+nuclide
 */
describe('AutocompleteCacher', () => {
  let getSuggestions;
  let updateResults;
  let shouldFilter;
  let mockedSuggestions = null;
  let mockedUpdateResults = null; // returned from the second call

  let secondMockedUpdateResults = null;
  let autocompleteCacher = null;
  let mockedRequest = null;
  let mockedRequest2 = null;
  let mockedRequest3 = null; // Denotes a new autocomplete session. Previous results cannot be re-used.

  let separateMockedRequest = null;

  function initializeAutocompleteCacher() {
    autocompleteCacher = new (_AutocompleteCacher().default)(getSuggestions, {
      updateResults,
      shouldFilter
    });
  }

  beforeEach(async () => {
    mockedSuggestions = Promise.resolve([]);
    mockedUpdateResults = ['first'];
    secondMockedUpdateResults = ['second'];
    mockedRequest = {
      editor: await atom.workspace.open(),
      bufferPosition: new _atom.Point(0, 0),
      scopeDescriptor: 'foo',
      prefix: '',
      activatedManually: false
    };
    mockedRequest2 = Object.assign({}, mockedRequest, {
      bufferPosition: new _atom.Point(0, 1),
      prefix: 'b'
    });
    mockedRequest3 = Object.assign({}, mockedRequest, {
      bufferPosition: new _atom.Point(0, 2),
      prefix: 'ba'
    });
    separateMockedRequest = Object.assign({}, mockedRequest, {
      bufferPosition: new _atom.Point(1, 0),
      prefix: ''
    });
    getSuggestions = jest.fn().mockImplementation(() => {
      return mockedSuggestions;
    });
    let updateResultsCallCount = 0;
    updateResults = jest.fn().mockImplementation(() => {
      let result;

      if (updateResultsCallCount > 0) {
        result = secondMockedUpdateResults;
      } else {
        result = mockedUpdateResults;
      }

      updateResultsCallCount++;
      return result;
    });
    initializeAutocompleteCacher();
  });
  it('should call through on first request', async () => {
    const results = await autocompleteCacher.getSuggestions(mockedRequest);
    expect(results).toBe((await mockedSuggestions));
    expect(getSuggestions).toHaveBeenCalledWith(mockedRequest);
    expect(updateResults).not.toHaveBeenCalled();
  });
  it('should just filter original results on the second request', async () => {
    await autocompleteCacher.getSuggestions(mockedRequest);
    const secondResults = await autocompleteCacher.getSuggestions(mockedRequest2);
    expect(getSuggestions.mock.calls.length).toBe(1);
    expect(getSuggestions).toHaveBeenCalledWith(mockedRequest);
    expect(updateResults.mock.calls.length).toBe(1);
    expect(updateResults).toHaveBeenCalledWith(mockedRequest, mockedRequest2, (await mockedSuggestions));
    expect(secondResults).toBe(mockedUpdateResults);
  });
  it('should satisfy a second query even if the original has not yet resolved', async () => {
    const originalSuggestionDeferred = new (_promise().Deferred)();
    mockedSuggestions = originalSuggestionDeferred.promise; // on purpose don't await here. the promise is not resolved until later

    const firstResultPromise = autocompleteCacher.getSuggestions(mockedRequest);
    const secondResultPromise = autocompleteCacher.getSuggestions(mockedRequest2);
    expect(getSuggestions.mock.calls.length).toBe(2);
    expect(getSuggestions).toHaveBeenCalledWith(mockedRequest);
    expect(updateResults).not.toHaveBeenCalled();
    originalSuggestionDeferred.resolve([]);
    expect((await firstResultPromise)).toBe((await originalSuggestionDeferred.promise));
    expect(updateResults.mock.calls.length).toBe(1);
    expect(updateResults).toHaveBeenCalledWith(mockedRequest, mockedRequest2, (await firstResultPromise));
    expect((await secondResultPromise)).toBe(mockedUpdateResults);
    expect(getSuggestions.mock.calls.length).toBe(2);
  });
  it('should satisfy a third query even if the original has not yet resolved', async () => {
    const originalSuggestionDeferred = new (_promise().Deferred)();
    mockedSuggestions = originalSuggestionDeferred.promise; // on purpose don't await here. the promise is not resolved until later

    autocompleteCacher.getSuggestions(mockedRequest);
    const secondResult = autocompleteCacher.getSuggestions(mockedRequest2);
    const finalResult = autocompleteCacher.getSuggestions(mockedRequest3);
    expect(getSuggestions.mock.calls.length).toBe(3);
    expect(getSuggestions).toHaveBeenCalledWith(mockedRequest);
    expect(updateResults).not.toHaveBeenCalled();
    originalSuggestionDeferred.resolve([]);
    expect((await secondResult)).toBe(mockedUpdateResults);
    expect((await finalResult)).toBe(secondMockedUpdateResults);
    expect(updateResults.mock.calls.length).toBe(2); // We expect mockedRequest to always be the original request for these
    // calls, since it completed with a non-null value.

    expect(updateResults.mock.calls.map(call => call)).toEqual([[mockedRequest, mockedRequest2, await mockedSuggestions], [mockedRequest, mockedRequest3, await mockedSuggestions]]);
    expect(getSuggestions.mock.calls.length).toBe(3);
  });
  it('should pass a new request through if it cannot filter', async () => {
    await autocompleteCacher.getSuggestions(mockedRequest);
    const secondResults = await autocompleteCacher.getSuggestions(separateMockedRequest);
    expect(getSuggestions.mock.calls.length).toBe(2);
    expect(getSuggestions.mock.calls.map(call => call)).toEqual([[mockedRequest], [separateMockedRequest]]);
    expect(updateResults).not.toHaveBeenCalled();
    expect(secondResults).toBe((await mockedSuggestions));
  });
  it('should pass a new request through if the first returned null', async () => {
    mockedSuggestions = Promise.resolve(null);
    await autocompleteCacher.getSuggestions(mockedRequest);
    const secondMockedSuggestion = [];
    mockedSuggestions = Promise.resolve(secondMockedSuggestion);
    const secondResults = await autocompleteCacher.getSuggestions(mockedRequest2);
    expect(getSuggestions.mock.calls.map(call => call)).toEqual([[mockedRequest], [mockedRequest2]]);
    expect(updateResults).not.toHaveBeenCalled();
    expect(secondResults).toBe(secondMockedSuggestion);
  });
  describe('with a custom shouldFilter function', () => {
    let shouldFilterResult = false;
    beforeEach(() => {
      shouldFilter = jest.fn().mockImplementation(() => shouldFilterResult);
      initializeAutocompleteCacher();
    });
    it('should not filter if not allowed', async () => {
      await autocompleteCacher.getSuggestions(mockedRequest);
      await autocompleteCacher.getSuggestions(mockedRequest2);
      expect(getSuggestions.mock.calls.length).toBe(2);
      expect(shouldFilter).toHaveBeenCalledWith(mockedRequest, mockedRequest2, 1);
      expect(updateResults).not.toHaveBeenCalled();
    });
    it('should filter if allowed', async () => {
      shouldFilterResult = true;
      await autocompleteCacher.getSuggestions(mockedRequest);
      const secondResults = await autocompleteCacher.getSuggestions(mockedRequest2);
      expect(getSuggestions.mock.calls.length).toBe(1);
      expect(getSuggestions).toHaveBeenCalledWith(mockedRequest);
      expect(updateResults.mock.calls.length).toBe(1);
      expect(updateResults).toHaveBeenCalledWith(mockedRequest, mockedRequest2, (await mockedSuggestions));
      expect(secondResults).toBe(mockedUpdateResults);
    });
    it('should check the cursor positions of requests before calling shouldFilter', async () => {
      await autocompleteCacher.getSuggestions(mockedRequest);
      await autocompleteCacher.getSuggestions(separateMockedRequest);
      expect(getSuggestions.mock.calls.length).toBe(2);
      expect(shouldFilter).not.toHaveBeenCalled();
      expect(updateResults).not.toHaveBeenCalled();
    });
  });
});