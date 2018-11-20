"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseMessages = parseMessages;

function _parseRegularLine() {
  const data = require("./parseRegularLine");

  _parseRegularLine = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

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
const PORT_LINE = /.*(?:Running.*|Listening )on port\s+(\d+)/;
const SOURCE_LIST_START = /Looking for (?:JS|JavaScript) files in/;
const READY_LINE = /(packager|server) ready|<END> {3}Starting Facebook Packager Server/i;
const SHUTDOWN_LINE = /Server was automatically shut down/;
const RESTARTING_LINE = /Restarting the server/;
/**
 * Parses output from Metro into messages.
 */

function parseMessages(raw) {
  return _rxjsCompatUmdMin.Observable.create(observer => {
    let sawPreamble = false;
    let sawPortLine = false;
    let sawSourcesStart = false;
    let sawSourcesEnd = false;
    let running = false;
    const sourceDirectories = [];
    return raw.subscribe({
      next: line => {
        // If we've seen the port and the sources, that's the preamble! Or, if we get to a line that
        // starts with a "[", we probably missed the closing of the preamble somehow. (Like the
        // output changed).
        sawPreamble = sawPreamble || sawPortLine && sawSourcesEnd || line.startsWith('[');

        if (!sawPortLine && !sawPreamble) {
          const match = line.match(PORT_LINE);

          if (match != null) {
            sawPortLine = true;
            observer.next({
              type: 'message',
              message: {
                level: 'info',
                text: `Running Metro on port ${match[1]}.`
              }
            });
            return;
          }
        }

        if (!sawSourcesStart && !sawPreamble) {
          sawSourcesStart = line.match(SOURCE_LIST_START) != null;
          return;
        } // Once we've seen the start of the source list, we need to accumulate a list until we see
        // a blank line.


        if (sawSourcesStart && !sawSourcesEnd && !sawPreamble) {
          if (!isBlankLine(line)) {
            // Add the directory to the list.
            sourceDirectories.push(line.trim());
          } else if (sourceDirectories.length > 0) {
            // We've gotten our list!
            sawSourcesEnd = true;
            observer.next({
              type: 'message',
              message: {
                level: 'info',
                text: `Looking for JS files in: ${sourceDirectories.join(',')}`
              }
            });
            return;
          }
        }

        if (sawPreamble) {
          // Drop all blank lines that come after the preamble.
          if (isBlankLine(line)) {
            return;
          }

          observer.next({
            type: 'message',
            message: (0, _parseRegularLine().parseRegularLine)(line)
          });

          if (!running && READY_LINE.test(line)) {
            observer.next({
              type: 'ready'
            });
            running = true;
          } // We don't use "Restarting the server..." to signal server restarting beacause
          // that message takes a long time to show up.


          if (running && SHUTDOWN_LINE.test(line)) {
            observer.next({
              type: 'restarting'
            });
            running = false;
          }

          if (!running && RESTARTING_LINE.test(line)) {
            sawPreamble = false;
            sawPortLine = false;
            sawSourcesStart = false;
            sawSourcesEnd = false;
            sourceDirectories.length = 0;
          }

          return;
        } // If we've gotten here, it means that we have an unhandled line in the preamble. Those are
        // the lines we want to ignore, so don't do anything.

      },
      error: observer.error.bind(observer),
      complete: observer.complete.bind(observer)
    });
  });
}

const isBlankLine = line => /^\s*$/.test(line);