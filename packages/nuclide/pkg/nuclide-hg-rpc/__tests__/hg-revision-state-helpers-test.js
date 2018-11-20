"use strict";

function _hgRevisionStateHelpers() {
  const data = require("../lib/hg-revision-state-helpers");

  _hgRevisionStateHelpers = function () {
    return data;
  };

  return data;
}

function _nuclideUri() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
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
describe('parseRevisionFileChangeOutput', () => {
  const testWorkingDirectory = '/Hg/Working/Directory';

  const test1 = _nuclideUri().default.join(testWorkingDirectory, 'test1.js');

  const test2 = _nuclideUri().default.join(testWorkingDirectory, 'test2.js');

  const test3 = _nuclideUri().default.join(testWorkingDirectory, 'test3.js');

  const test4 = _nuclideUri().default.join(testWorkingDirectory, 'test4.js');

  const test5 = _nuclideUri().default.join(testWorkingDirectory, 'test5.js');

  const testOrig1 = _nuclideUri().default.join(testWorkingDirectory, 'test-orig1.js');

  const testOrig2 = _nuclideUri().default.join(testWorkingDirectory, 'test-orig2.js');

  it('correctly parses a revision with files added, deleted, copied, and modified.', () => {
    // This output is in the form of the REVISION_FILE_CHANGES_TEMPLATE in
    // hg-revision-state-helpers.
    const testOutput = `files: test1.js test2.js test3.js test4.js test5.js
file-adds: test1.js test2.js
file-dels: test3.js test4.js
file-copies: test1.js (test-orig1.js)test2.js (test-orig2.js)
file-mods: test4.js test5.js`;
    const result = (0, _hgRevisionStateHelpers().parseRevisionFileChangeOutput)(testOutput, testWorkingDirectory);
    const expectedResult = {
      all: [test1, test2, test3, test4, test5],
      added: [test1, test2],
      deleted: [test3, test4],
      copied: [{
        from: testOrig1,
        to: test1
      }, {
        from: testOrig2,
        to: test2
      }],
      modified: [test4, test5]
    };
    expect(result).toEqual(expectedResult);
  }); // While this isn't a technically possible situation, the parser doesn't care.
  // This lets us to test the null cases all at once.

  it('correctly parses a revision with no files added, deleted, copied, or modified.', () => {
    // This output is in the form of the REVISION_FILE_CHANGES_TEMPLATE in
    // hg-revision-state-helpers.
    const testOutput = `files:
file-adds:
file-dels:
file-copies:
file-mods:`;
    const result = (0, _hgRevisionStateHelpers().parseRevisionFileChangeOutput)(testOutput, testWorkingDirectory);
    const expectedResult = {
      all: [],
      added: [],
      deleted: [],
      copied: [],
      modified: []
    };
    expect(result).toEqual(expectedResult);
  });
});