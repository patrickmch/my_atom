"use strict";

function _TestSuiteModel() {
  const data = _interopRequireDefault(require("../lib/TestSuiteModel"));

  _TestSuiteModel = function () {
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
describe('TestSuiteModel', () => {
  const testClassSummaries = [{
    id: 1,
    fileName: 'foo',
    className: 'foo',
    name: 'foo'
  }, {
    id: 2,
    fileName: 'bar',
    className: 'bar',
    name: 'bar'
  }];
  const badTestRun = {
    durationSecs: 0.1,
    name: 'foo',
    numAssertions: 1,
    numFailures: 0,
    numMethods: 1,
    numSkipped: 0,
    status: 3
  };
  const goodTestRun = {
    durationSecs: 1.1,
    name: 'foo',
    numAssertions: 1,
    numFailures: 0,
    numMethods: 1,
    numSkipped: 0,
    status: 2,
    test_json: testClassSummaries[0]
  };
  it('maps test class IDs from a Array<TestClassSummary>', () => {
    const model = new (_TestSuiteModel().default)(testClassSummaries);
    const testClassSummary = testClassSummaries[0];
    expect(model.testClasses.get(testClassSummary.id)).toBe(testClassSummary);
  });
  it('calculates progress percent', () => {
    const model = new (_TestSuiteModel().default)(testClassSummaries);
    model.addTestRun(goodTestRun);
    expect(model.progressPercent()).toBe(50);
  });
  it('handles bad test runs (invalid syntax in test file, for example)', () => {
    const model = new (_TestSuiteModel().default)(testClassSummaries);
    expect(model.addTestRun.bind(model, badTestRun)).not.toThrow(); // The bad test run has no ID and so is not added to the TestSuiteModel's summary.

    expect(model.testRuns.size).toBe(0);
  });
});