"use strict";

function _utils() {
  const data = require("../lib/utils");

  _utils = function () {
    return data;
  };

  return data;
}

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
jest.unmock('log4js');

// Construct a loggingEvent following log4js event format.
function createLoggingEvent(...args) {
  return {
    startTime: new Date(),
    categoryName: 'test',
    data: args,
    level: {
      level: 40000,
      levelStr: 'ERROR'
    },
    logger: {
      category: 'arsenal',
      _events: {
        log: [null, null]
      }
    }
  };
}

describe('Logview Appender Utils.', () => {
  it('patches error of loggingEvent', () => {
    const error = new Error('test');
    const loggingEventWithError = createLoggingEvent(error);
    expect(loggingEventWithError.data[0] instanceof Error).toBe(true);
    expect(loggingEventWithError.data[0]).toBe(error);
    const patchedLoggingEventWithError = (0, _utils().patchErrorsOfLoggingEvent)(loggingEventWithError);
    expect(patchedLoggingEventWithError.data[0] instanceof Error).toBe(false);
    expect(typeof patchedLoggingEventWithError.data[0].stack).toBe('string');
    expect(patchedLoggingEventWithError.data[0].stackTrace instanceof Array).toBe(true);
    const callsite = patchedLoggingEventWithError.data[0].stackTrace[0];
    expect(callsite.fileName).toBe(__filename);
  });
  it('addes error if no error exists in loggingEvent.data', () => {
    const loggingEventWithoutError = createLoggingEvent();
    expect(loggingEventWithoutError.data.length).toBe(0);
    const patchedLoggingEventWithoutError = (0, _utils().patchErrorsOfLoggingEvent)(loggingEventWithoutError);
    expect(typeof patchedLoggingEventWithoutError.data[0].stack).toBe('string');
  });
  it('Test serialization/deserialization utils.', () => {
    const loggingEvent = (0, _utils().patchErrorsOfLoggingEvent)(createLoggingEvent(new Error('123')));
    const serialization = (0, _utils().serializeLoggingEvent)(loggingEvent);
    expect(typeof serialization === 'string').toBe(true);
    const deserialization = (0, _utils().deserializeLoggingEvent)(serialization);
    expect(deserialization.startTime.toString()).toEqual(loggingEvent.startTime.toString());
    expect(deserialization.categoryName).toEqual(loggingEvent.categoryName);
    expect(JSON.stringify(deserialization.level)).toEqual(JSON.stringify(loggingEvent.level));
    expect(JSON.stringify(deserialization.logger)).toEqual(JSON.stringify(loggingEvent.logger));
    expect(JSON.stringify(deserialization.data[0])).toEqual(JSON.stringify(loggingEvent.data[0]));
  });
});