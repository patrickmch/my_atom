"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../modules/nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
    return data;
  };

  return data;
}

function _nuclideAnalytics() {
  const data = require("../modules/nuclide-analytics");

  _nuclideAnalytics = function () {
    return data;
  };

  return data;
}

function _observableDom() {
  const data = require("../modules/nuclide-commons-ui/observable-dom");

  _observableDom = function () {
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
 */

/* eslint-env browser */
const REACT_EMOJI = '\u269B';
const WARNING_EMOJI = '\u26D4';
const SAMPLE_RATE = 20;
const STALL_THRESHOLD_MS = 30; // parse "mount" from '\u269B MarkedStringSnippet [mount]'

const LIFECYCLE_RE = new RegExp(`(${REACT_EMOJI}|${WARNING_EMOJI}) (\\S+) \\[(\\S+)\\]`);
const METHOD_RE = new RegExp(`(${REACT_EMOJI}|${WARNING_EMOJI}) (\\S+)\\.(\\S+)$`);
/**
 * Monitor important measurements while React renders out components.
 * The only reasonable way to do this is patching performance.measure as React
 * removes its measurements from performance timing immediately as it wants to
 * preserve the buffer memory, and events are logged to the timeline either way.
 *
 * This should only be loaded in Dev Mode. The production build of React
 * does not emit performance measurements, so it is not worth intercepting
 * events in that case.
 */

class ReactDevPerfMonitor {
  constructor() {
    this._disposable = new (_UniversalDisposable().default)(new (_observableDom().PerformanceObservable)({
      entryTypes: ['measure']
    }).mergeMap(list => list.getEntries()).filter(entry => (entry.name.startsWith(REACT_EMOJI) || entry.name.startsWith(WARNING_EMOJI)) && entry.name[2] !== '(' // high-level react processes aren't interesting
    ).map(entry => {
      let component;
      let lifecycle;
      let method;
      const lifecycleResult = entry.name.match(LIFECYCLE_RE);
      const methodResult = entry.name.match(METHOD_RE);

      if (lifecycleResult) {
        [component, lifecycle] = lifecycleResult.slice(2);
      } else if (methodResult) {
        [component, method] = methodResult.slice(2);
      }

      return {
        duration: entry.duration.toString(),
        eventName: entry.name.slice(2),
        // remove the emoji
        component,
        lifecycle,
        method
      };
    }).subscribe(trackEntry => {
      (0, _nuclideAnalytics().trackSampled)('react-performance', // We always want to track long renders as their insight is valuable, so set
      // their sample rate to 1.
      // In reporting, weight faster renders at SAMPLE_RATE*x their value to
      // continue to get accurate reporting.
      Number(trackEntry.duration) >= STALL_THRESHOLD_MS ? 1 : SAMPLE_RATE, trackEntry);
    }));
  }

  dispose() {
    this._disposable.dispose();
  }

}

exports.default = ReactDevPerfMonitor;