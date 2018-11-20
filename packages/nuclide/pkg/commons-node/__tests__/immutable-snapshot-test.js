"use strict";

function _immutableSnapshot() {
  const data = require("../immutable-snapshot");

  _immutableSnapshot = function () {
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
describe('immutable-snapshot', () => {
  let snapshotter;
  let reader;
  beforeEach(() => {
    snapshotter = new (_immutableSnapshot().ImmutableSnapshotter)();
    reader = new (_immutableSnapshot().ImmutableSnapshotReader)();
  });

  function verify(object, expected) {
    const isDeltaSnapshot = snapshotter._previousSnapshotObjects != null;
    const snapshot = snapshotter.createDeltaSnapshot(object);
    const stringified = JSON.stringify(snapshot, null, 2);
    expect(JSON.parse(stringified)).toEqual(snapshot);
    expect(reader.readSnapshot(snapshot).toJS()).toEqual(expected);

    if (isDeltaSnapshot) {
      const {
        root,
        snapshotObjects
      } = snapshot;
      const serialized = snapshotObjects[root];
      expect(serialized.type).toBe('delta');
    }
  }

  describe('List', () => {
    it('records basic mutations', () => {
      let list = (0, _immutableSnapshot().List)([1, 2, 3]);
      verify(list, [1, 2, 3]);
      list = list.push(4);
      list = list.push(5);
      list = list.shift();
      list = list.delete(1);
      verify(list, [2, 4, 5]);
    });
    it('does not store mutations to an empty object', () => {
      let list = (0, _immutableSnapshot().List)([]);
      verify(list, []);
      list = list.push(1);
      const {
        root,
        snapshotObjects
      } = snapshotter.createDeltaSnapshot(list);
      expect(snapshotObjects[root].type).toBe('list');
    });
    it('works with JS objects', () => {
      let list = (0, _immutableSnapshot().List)([1]);
      verify(list, [1]);
      list = list.push([1, 2, 3]).push({
        a: {
          b: 1
        }
      });
      verify(list, [1, [1, 2, 3], {
        a: {
          b: 1
        }
      }]);
    });
    it('works with withMutations', () => {
      let list = (0, _immutableSnapshot().List)([1, 2, 3]);
      verify(list, [1, 2, 3]);
      list = list.withMutations(mutableList => {
        mutableList.clear();
        mutableList.push(4);
        mutableList.push(5);
      });
      verify(list, [4, 5]);
    });
    it('continues to wrap things after an unserializable mutation', () => {
      let list = (0, _immutableSnapshot().List)([1, 2, 3]).sort((x, y) => y - x);
      verify(list, [3, 2, 1]);
      list = list.unshift(4);
      verify(list, [4, 3, 2, 1]);
    });
  });
  describe('Map', () => {
    it('records basic mutations', () => {
      let map = (0, _immutableSnapshot().Map)([['a', 1]]);
      verify(map, {
        a: 1
      });
      map = map.set('b', 2);
      map = map.set('a', 3);
      verify(map, {
        a: 3,
        b: 2
      });
    });
    it('serializes mutations correctly', () => {
      const a = (0, _immutableSnapshot().Map)([['a', 1]]);
      snapshotter.createDeltaSnapshot(a);
      const b = a.set('b', 2);
      const {
        root,
        snapshotObjects
      } = snapshotter.createDeltaSnapshot(b);
      const serialized = snapshotObjects[root];
      expect(serialized.type).toBe('delta');

      if (!(serialized.type === 'delta')) {
        throw new Error("Invariant violation: \"serialized.type === 'delta'\"");
      }

      expect(serialized.mutations).toEqual([{
        method: 'set',
        args: ['b', 2]
      }]);
    });
    it('works with withMutations', () => {
      let map = (0, _immutableSnapshot().Map)([['a', 1]]);
      verify(map, {
        a: 1
      });
      map = map.withMutations(mutableMap => {
        mutableMap.clear();
        mutableMap.set('a', 3);
        mutableMap.set('b', 2);
        mutableMap.delete('a');
      });
      verify(map, {
        b: 2
      });
    });
    it('works with nested maps', () => {
      let map = (0, _immutableSnapshot().Map)();
      let map2 = (0, _immutableSnapshot().Map)();
      map = map.set('x', map2);
      verify(map, {
        x: {}
      });
      map2 = map2.set('a', 1);
      map2 = map2.set('b', 2);
      map = map.set('x', map2);
      verify(map, {
        x: {
          a: 1,
          b: 2
        }
      });
    });
    it('works with duplicated values', () => {
      let map = (0, _immutableSnapshot().Map)();
      const list = (0, _immutableSnapshot().List)([1, 2, 3]);
      map = map.set('x', list);
      map = map.set('y', list);
      const {
        root,
        snapshotObjects
      } = snapshotter.createDeltaSnapshot(map);
      const serialized = snapshotObjects[root];
      expect(serialized.type).toBe('map');

      if (!(serialized.type === 'map')) {
        throw new Error("Invariant violation: \"serialized.type === 'map'\"");
      } // The value for 'y' should just be an ID.


      const y = serialized.value[1][1];

      if (!(y != null && typeof y.type === 'string')) {
        throw new Error("Invariant violation: \"y != null && typeof y.type === 'string'\"");
      }

      expect(y.type).toBe('ref');
    });
    it('returns an OrderedMap from sort', () => {
      let map = (0, _immutableSnapshot().Map)({
        b: 1,
        a: 1
      });
      map = map.sort();
      expect(map instanceof _immutableSnapshot().OrderedMap).toBe(true);
      verify(map, {
        a: 1,
        b: 1
      });
      map = map.set('c', 2);
      verify(map, {
        a: 1,
        b: 1,
        c: 2
      });
    });
  });
  describe('Record', () => {
    it('records basic mutations', () => {
      const TestRecord = (0, _immutableSnapshot().Record)({
        a: 0,
        b: 0
      });
      let record = new TestRecord({
        a: 1,
        b: 0
      });
      verify(record, {
        a: 1,
        b: 0
      });
      record = record.set('b', 2);
      record = record.set('a', 3);
      verify(record, {
        a: 3,
        b: 2
      });
    });
  });
});