"use strict";

function _fsPromise() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/fsPromise"));

  _fsPromise = function () {
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

function _promise() {
  const data = require("../../../modules/nuclide-commons/promise");

  _promise = function () {
    return data;
  };

  return data;
}

function _watchFileCreationAndDeletion() {
  const data = require("../lib/watchFileCreationAndDeletion");

  _watchFileCreationAndDeletion = function () {
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
describe('watchFileCreationAndDeletion', () => {
  describe('getFilesInstantaneousExistance', () => {
    it('correctly gets files existance', async () => {
      const repoPath = 'myRepoPath';
      const fileA = 'fileA.txt';
      const fileB = 'fileB.txt';
      const fileC = 'fileC.txt';

      const qualifiedFileA = _nuclideUri().default.join(repoPath, fileA);

      const qualifiedFileB = _nuclideUri().default.join(repoPath, fileB);

      const qualifiedFileC = _nuclideUri().default.join(repoPath, fileC);

      let resolveFileA;
      const fileAPromise = new Promise((resolve, reject) => resolveFileA = resolve);
      let resolveFileB;
      const fileBPromise = new Promise((resolve, reject) => resolveFileB = resolve);
      let resolveFileC;
      const fileCPromise = new Promise((resolve, reject) => resolveFileC = resolve);
      const existsSpy = jest.spyOn(_fsPromise().default, 'exists').mockImplementation(filename => {
        switch (filename) {
          case qualifiedFileA:
            return fileAPromise;

          case qualifiedFileB:
            return fileBPromise;

          case qualifiedFileC:
            return fileCPromise;
        }

        throw new Error(`unknown file ${filename} had existance checked`);
      });
      const files = [fileA, fileB, fileC];
      const existanceObservable = (0, _watchFileCreationAndDeletion().getFilesInstantaneousExistance)(repoPath, files); // $FlowFixMe

      resolveFileB(false);
      await (0, _promise().nextTick)(); // $FlowFixMe

      resolveFileA(true); // $FlowFixMe

      resolveFileC(false);
      const existanceResult = await existanceObservable.toPromise();
      expect(existanceResult).toEqual(new Map([[fileA, true], [fileB, false], [fileC, false]]));
      existsSpy.mockReset();
    });
  });
});