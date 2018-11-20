"use strict";

var _atom = require("atom");

function _HyperclickHelpers() {
  const data = _interopRequireDefault(require("../lib/HyperclickHelpers"));

  _HyperclickHelpers = function () {
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
const fakeEditor = {
  getPath() {
    return '/path1/path2/file';
  }

};
describe('HyperclickHelpers', () => {
  let findTagsResult = [];
  let goToLocationSpy = null;
  beforeEach(() => {
    // HACK: goToLocation is a getter. Not too easy to mock out :(
    goToLocationSpy = jest.spyOn(require("../../../modules/nuclide-commons-atom/go-to-location"), 'goToLocation'); // Mock the services we use.

    jest.spyOn(require("../../nuclide-remote-connection"), 'getCtagsServiceByNuclideUri').mockImplementation(service => {
      return {
        getCtagsService() {
          return {
            async getTagsPath() {
              return '/tags';
            },

            async findTags(path, query) {
              return findTagsResult;
            },

            dispose() {}

          };
        }

      };
    });
    jest.spyOn(require("../../nuclide-remote-connection"), 'getFileSystemServiceByNuclideUri').mockImplementation(service => {
      return {
        readFile() {
          return new Buffer('function A\ntest\nclass A\n');
        }

      };
    });
  });
  it('works with multiple tag results', async () => {
    findTagsResult = [{
      name: 'A',
      file: '/path1/a',
      lineNumber: 0,
      kind: 'c',
      pattern: '/^class A$/'
    }, {
      name: 'A',
      file: '/test/a',
      lineNumber: 0,
      kind: '',
      pattern: '/^struct A$/',
      fields: new Map([['namespace', 'test']])
    }, {
      name: 'A',
      file: '/path1/path2/a.py',
      kind: 'f',
      lineNumber: 1337,
      pattern: '/function A/',
      fields: new Map([['class', 'class']])
    }];
    const result = await _HyperclickHelpers().default.getSuggestionForWord(fakeEditor, 'A', new _atom.Range([0, 0], [0, 1]));

    if (!result) {
      throw new Error("Invariant violation: \"result\"");
    } // Note the ordering (by matching path prefix).


    expect(result.callback instanceof Array).toBe(true);
    expect(result.callback[0].title).toBe('function class.A (path1/path2/a.py)');
    expect(result.callback[1].title).toBe('class A (path1/a)');
    expect(result.callback[2].title).toBe('test::A (test/a)'); // Blindly use line numbers, if they're given.

    await result.callback[0].callback();
    expect(goToLocationSpy).toHaveBeenCalledWith('/path1/path2/a.py', {
      line: 1336,
      column: 0
    }); // Find the line by pattern, in other cases.

    await result.callback[1].callback();
    expect(goToLocationSpy).toHaveBeenCalledWith('/path1/a', {
      line: 2,
      column: 0
    }); // Default to the first line, if it's not actually in the file any more.

    await result.callback[2].callback();
    expect(goToLocationSpy).toHaveBeenCalledWith('/test/a', {
      line: 0,
      column: 0
    });
  });
  it('directly jumps for single results', async () => {
    findTagsResult = [{
      name: 'test',
      file: '/test',
      kind: 'class',
      lineNumber: 0,
      pattern: '/^test$/'
    }];
    const result = await _HyperclickHelpers().default.getSuggestionForWord(fakeEditor, 'test', new _atom.Range([0, 0], [0, 1]));

    if (!result) {
      throw new Error("Invariant violation: \"result\"");
    }

    if (!(typeof result.callback === 'function')) {
      throw new Error("Invariant violation: \"typeof result.callback === 'function'\"");
    }

    await result.callback();
    expect(goToLocationSpy).toHaveBeenCalledWith('/test', {
      line: 1,
      column: 0
    });
  });
  it('returns null for no results', async () => {
    findTagsResult = [];
    const result = await _HyperclickHelpers().default.getSuggestionForWord(fakeEditor, 'test', new _atom.Range([0, 0], [0, 1]));
    expect(result).toBe(null);
  });
});