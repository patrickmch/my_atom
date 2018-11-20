"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HistogramTracker = void 0;

function _track() {
  const data = require("./track");

  _track = function () {
    return data;
  };

  return data;
}

/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 *  strict-local
 * @format
 */
const HISTOGRAM_TRACKER_KEY = 'performance-histogram';

class Bucket {
  constructor() {
    this._count = 0;
    this._sum = 0;
  }

  addValue(value) {
    this._sum += value;
    this._count++;
  }

  getCount() {
    return this._count;
  }

  getAverage() {
    return this._count > 0 ? this._sum / this._count : 0;
  }

  clear() {
    this._count = 0;
    this._sum = 0;
  }

}

class HistogramTracker {
  constructor(eventName, maxValue, numBuckets, intervalSeconds = 60) {
    this._eventName = eventName;
    this._maxValue = maxValue;
    this._bucketSize = maxValue / numBuckets;
    this._buckets = new Array(numBuckets);

    for (let i = 0; i < numBuckets; i++) {
      this._buckets[i] = new Bucket();
    }

    this._intervalId = setInterval(() => {
      // Potential race condition if intervalSeconds is too small.
      this.saveAnalytics();
    }, intervalSeconds * 1000);
  }

  dispose() {
    clearInterval(this._intervalId);
  }

  track(value) {
    const bucket = Math.min(this._buckets.length - 1, Math.floor(value / this._bucketSize));

    this._buckets[bucket].addValue(value);

    return this;
  }

  saveAnalytics() {
    for (let i = 0; i < this._buckets.length; i++) {
      const bucket = this._buckets[i];

      if (bucket.getCount() > 0 && _track().track != null) {
        (0, _track().track)(HISTOGRAM_TRACKER_KEY, {
          eventName: this._eventName,
          average: bucket.getAverage(),
          samples: bucket.getCount()
        });
      }
    }

    this.clear();
  }

  clear() {
    for (let i = 0; i < this._buckets.length; i++) {
      this._buckets[i].clear();
    }
  }

}

exports.HistogramTracker = HistogramTracker;