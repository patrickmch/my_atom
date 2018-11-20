"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = trackKeyLatency;
exports.KEYSTROKES_TO_IGNORE = void 0;

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
    return data;
  };

  return data;
}

function _nuclideAnalytics() {
  const data = require("../../../modules/nuclide-analytics");

  _nuclideAnalytics = function () {
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

/* global performance, requestAnimationFrame */
const SAMPLE_RATE = 100; // 1 in 100 keystrokes will be measured.

const KEYSTROKES_TO_IGNORE = 10; // exported for testing

exports.KEYSTROKES_TO_IGNORE = KEYSTROKES_TO_IGNORE;
const HISTOGRAM_MAX = 100;
const HISTOGRAM_BUCKETS = 10; // 10ms / bucket

const HISTOGRAM_INTERVAL_SEC = 10 * 60; // 5 mins

/**
 * This attempts to record an approximate measure of key latency (sampled at SAMPLE_RATE).
 * We start a timer on TextEditor.onWillInsertText and then wait:
 *
 * 1) for setImmediate to wait for all associated handlers and microtasks to finish
 * 2) and then, an animation frame to wait for Atom to re-render the editor.
 *
 * For a justification, see this profile of a keystroke's journey: https://i.imgur.com/rY0C2uf.png
 */

function trackKeyLatency() {
  const keyLatencyTracker = new (_nuclideAnalytics().HistogramTracker)('key-latency', HISTOGRAM_MAX, HISTOGRAM_BUCKETS, HISTOGRAM_INTERVAL_SEC);
  const keyListenerLatencyTracker = new (_nuclideAnalytics().HistogramTracker)('key-listener-latency', HISTOGRAM_MAX, HISTOGRAM_BUCKETS, HISTOGRAM_INTERVAL_SEC);
  const disposables = new (_UniversalDisposable().default)(keyLatencyTracker, keyListenerLatencyTracker);
  disposables.add(atom.workspace.observeTextEditors(editor => {
    // Add a slight delay to allow other listeners to attach first.
    setTimeout(() => {
      if (editor.isDestroyed()) {
        return;
      } // The first few keystrokes tend to be slower, so ignore them.


      let keystroke = SAMPLE_RATE - KEYSTROKES_TO_IGNORE;
      const unshift = true; // We need to access the (private) emitter to use `unshift`.
      // This ensures that we include other will-insert-text handlers.

      disposables.addUntilDestroyed(editor, // $FlowIgnore
      editor.emitter.on('will-insert-text', ({
        text
      }) => {
        if (keystroke++ % SAMPLE_RATE === 0 && text.length === 1) {
          const startTime = performance.now();
          setImmediate(() => {
            keyListenerLatencyTracker.track(performance.now() - startTime);
            requestAnimationFrame(() => {
              keyLatencyTracker.track(performance.now() - startTime);
            });
          });
        }
      }, unshift));
    }, 100);
  }));
  return disposables;
}