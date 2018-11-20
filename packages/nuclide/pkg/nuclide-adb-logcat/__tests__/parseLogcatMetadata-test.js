"use strict";

function _parseLogcatMetadata() {
  const data = _interopRequireDefault(require("../lib/parseLogcatMetadata"));

  _parseLogcatMetadata = function () {
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
describe('parseLogcatMetadata', () => {
  const formats = ['[ 01-14 17:15:01.003   640:  654 I/ProcessStatsService ]', // Older versions use hex for the tid.
  '[ 01-14 17:15:01.003   640:0x28e I/ProcessStatsService ]'];
  formats.forEach(raw => {
    describe(raw, () => {
      const parsed = (0, _parseLogcatMetadata().default)(raw);

      if (!(parsed != null)) {
        throw new Error("Invariant violation: \"parsed != null\"");
      }

      it('parses the date and time', () => {
        expect(parsed.time).toBe('01-14 17:15:01.003');
      });
      it('parses the pid', () => {
        expect(parsed.pid).toBe(640);
      });
      it('parses the tid', () => {
        expect(parsed.tid).toBe(654);
      });
      it('parses the priority', () => {
        expect(parsed.priority).toBe('I');
      });
      it('parses the tag', () => {
        expect(parsed.tag).toBe('ProcessStatsService');
      });
    });
  });
  it('parses weird tags', () => {
    const parsed = (0, _parseLogcatMetadata().default)('[ 05-10 17:49:43.925  5846: 5993 D/fb4a(:<default>):PeriodicForegroundScheduler ]');

    if (!(parsed != null)) {
      throw new Error("Invariant violation: \"parsed != null\"");
    }

    expect(parsed.tag).toBe('fb4a(:<default>):PeriodicForegroundScheduler');
  });
  it('parses the 5-digit tid', () => {
    const parsed = (0, _parseLogcatMetadata().default)('[ 01-28 14:59:27.633  3211:15223 I/ReactNativeJS ]');

    if (!(parsed != null)) {
      throw new Error("Invariant violation: \"parsed != null\"");
    }

    expect(parsed.tid).toBe(15223);
  });
});