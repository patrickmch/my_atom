"use strict";

function _waits_for() {
  const data = _interopRequireDefault(require("../../../jest/waits_for"));

  _waits_for = function () {
    return data;
  };

  return data;
}

function _dummy() {
  const data = require("../__mocks__/dummy1");

  _dummy = function () {
    return data;
  };

  return data;
}

function _utils() {
  const data = require("../lib/utils");

  _utils = function () {
    return data;
  };

  return data;
}

function Immutable() {
  const data = _interopRequireWildcard(require("immutable"));

  Immutable = function () {
    return data;
  };

  return data;
}

function _nullthrows() {
  const data = _interopRequireDefault(require("nullthrows"));

  _nullthrows = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
describe('BookShelf Utils', () => {
  describe('serialize/deserialize', () => {
    const REPO_PATH_1 = '/fake/path_1';
    const SHOTHEAD_1_1 = 'FOO';
    const ACTIVE_SHOTHEAD_1 = '';
    const REPO_STATE_1 = {
      activeShortHead: ACTIVE_SHOTHEAD_1,
      isRestoring: false,
      shortHeadsToFileList: Immutable().Map([[SHOTHEAD_1_1, ['a.txt', 'b.txt']]])
    };
    const REPO_PATH_2 = '/fake/path_2';
    const SHOTHEAD_2_1 = 'bar';
    const SHOTHEAD_2_2 = 'baz';
    const ACTIVE_SHOTHEAD_2 = 'baz';
    const REPO_STATE_2 = {
      activeShortHead: ACTIVE_SHOTHEAD_2,
      isRestoring: false,
      shortHeadsToFileList: Immutable().Map([[SHOTHEAD_2_1, ['c.txt', 'd.txt']], [SHOTHEAD_2_2, ['e.txt']]])
    };
    describe('serializeBookShelfState', () => {
      it('serializes an empty state', () => {
        const serialized = (0, _utils().serializeBookShelfState)((0, _utils().getEmptBookShelfState)());
        expect(serialized.repositoryPathToState.length).toBe(0);
      });
      it('serializes bookshelf state maps to entries pais', () => {
        const serialized = (0, _utils().serializeBookShelfState)({
          repositoryPathToState: Immutable().Map([[REPO_PATH_1, REPO_STATE_1], [REPO_PATH_2, REPO_STATE_2]])
        });
        expect(serialized.repositoryPathToState.length).toBe(2);
        const serializedRepoState1 = serialized.repositoryPathToState[0];
        expect(serializedRepoState1.length).toBe(2);
        expect(serializedRepoState1[0]).toBe(REPO_PATH_1);
        expect(serializedRepoState1[1].activeShortHead).toBe(ACTIVE_SHOTHEAD_1);
        expect(serializedRepoState1[1].isRestoring).toBeUndefined();
        expect(serializedRepoState1[1].shortHeadsToFileList.length).toBe(1);
        expect(serializedRepoState1[1].shortHeadsToFileList[0][0]).toBe(SHOTHEAD_1_1);
        expect(serializedRepoState1[1].shortHeadsToFileList[0][1].join(',')).toBe(['a.txt', 'b.txt'].join(','));
        const serializedRepoState2 = serialized.repositoryPathToState[1];
        expect(serializedRepoState2.length).toBe(2);
        expect(serializedRepoState2[0]).toBe(REPO_PATH_2);
        expect(serializedRepoState2[1].shortHeadsToFileList.length).toBe(2);
      });
      it('serializing an invalid bookshelf state throws', () => {
        expect(() => (0, _utils().serializeBookShelfState)({})).toThrow();
      });
    });
    describe('deserializeBookShelfState', () => {
      it('dserializes null to an empty state', () => {
        const deserialized = (0, _utils().deserializeBookShelfState)(null);
        expect(deserialized.repositoryPathToState.size).toBe(0);
      });
      it('dserializes one repository state', () => {
        const serializedState = {
          repositoryPathToState: [[REPO_PATH_1, Object.assign({}, REPO_STATE_1, {
            shortHeadsToFileList: Array.from(REPO_STATE_1.shortHeadsToFileList.entries())
          })]]
        };
        const deserialized = (0, _utils().deserializeBookShelfState)(serializedState);
        expect(deserialized.repositoryPathToState.size).toBe(1);
        const deserializedRepoState = deserialized.repositoryPathToState.get(REPO_PATH_1);
        expect(deserializedRepoState).not.toBeNull();

        if (!(deserializedRepoState != null)) {
          throw new Error("Invariant violation: \"deserializedRepoState != null\"");
        }

        expect(deserializedRepoState.activeShortHead).toBe(ACTIVE_SHOTHEAD_1);
        expect(deserializedRepoState.isRestoring).toBe(false);
        expect(deserializedRepoState.shortHeadsToFileList.size).toBe(1);
        expect((0, _nullthrows().default)(deserializedRepoState.shortHeadsToFileList.get(SHOTHEAD_1_1)).join(',')).toBe(['a.txt', 'b.txt'].join(','));
      });
      it('dserializes two repository states', () => {
        const serializedState = {
          repositoryPathToState: [[REPO_PATH_1, Object.assign({}, REPO_STATE_1, {
            shortHeadsToFileList: Array.from(REPO_STATE_1.shortHeadsToFileList.entries())
          })], [REPO_PATH_2, Object.assign({}, REPO_STATE_2, {
            shortHeadsToFileList: Array.from(REPO_STATE_2.shortHeadsToFileList.entries())
          })]]
        };
        const deserialized = (0, _utils().deserializeBookShelfState)(serializedState);
        expect(deserialized.repositoryPathToState.size).toBe(2);
        const deserializedRepoState1 = (0, _nullthrows().default)(deserialized.repositoryPathToState.get(REPO_PATH_1));
        expect(deserializedRepoState1).not.toBeNull();

        if (!(deserializedRepoState1 != null)) {
          throw new Error("Invariant violation: \"deserializedRepoState1 != null\"");
        }

        expect(deserializedRepoState1.activeShortHead).toBe(ACTIVE_SHOTHEAD_1);
        expect(deserializedRepoState1.isRestoring).toBe(false);
        expect(deserializedRepoState1.shortHeadsToFileList.size).toBe(1);
        expect((0, _nullthrows().default)(deserializedRepoState1.shortHeadsToFileList.get(SHOTHEAD_1_1)).join(',')).toBe(['a.txt', 'b.txt'].join(','));
        const deserializedRepoState2 = (0, _nullthrows().default)(deserialized.repositoryPathToState.get(REPO_PATH_2));
        expect(deserializedRepoState2).not.toBeNull();

        if (!(deserializedRepoState2 != null)) {
          throw new Error("Invariant violation: \"deserializedRepoState2 != null\"");
        }

        expect(deserializedRepoState2.activeShortHead).toBe(ACTIVE_SHOTHEAD_2);
        expect(deserializedRepoState2.isRestoring).toBe(false);
        expect(deserializedRepoState2.shortHeadsToFileList.size).toBe(2);
        expect((0, _nullthrows().default)(deserializedRepoState2.shortHeadsToFileList.get(SHOTHEAD_2_1)).join(',')).toBe(['c.txt', 'd.txt'].join(','));
        expect((0, _nullthrows().default)(deserializedRepoState2.shortHeadsToFileList.get(SHOTHEAD_2_2)).join(',')).toBe('e.txt');
      });
      it('deserializing an invalid state throws an exception', () => {
        expect(() => (0, _utils().deserializeBookShelfState)({
          repositoryPathToState: 123
        })).toThrow();
      });
    });
  });
  test('getShortHeadChangesFromStateStream', async () => {
    const states = new _rxjsCompatUmdMin.Subject();
    const shortHeadChangesStream = (0, _utils().getShortHeadChangesFromStateStream)(states);
    const shortHeadChanges = [];
    shortHeadChangesStream.subscribe(change => shortHeadChanges.push(change));
    states.next((0, _dummy().getDummyBookShelfState)());
    const newActiveShortHead = 'foo_bar';
    const newStateWithShortHeadChange = (0, _dummy().getDummyBookShelfState)();
    const newRepositoryState = newStateWithShortHeadChange.repositoryPathToState.get(_dummy().REPO_PATH_1);
    (0, _nullthrows().default)(newRepositoryState).activeShortHead = newActiveShortHead;
    states.next(newStateWithShortHeadChange);
    states.complete();
    await (0, _waits_for().default)(() => shortHeadChanges.length === 1);
    const {
      repositoryPath,
      activeShortHead
    } = shortHeadChanges[0];
    expect(repositoryPath).toBe(_dummy().REPO_PATH_1);
    expect(activeShortHead).toBe(newActiveShortHead);
  });
});