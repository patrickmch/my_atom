'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _asyncToGenerator = _interopRequireDefault(require('async-to-generator'));var _vscodeDebugprotocol;











function _load_vscodeDebugprotocol() {return _vscodeDebugprotocol = _interopRequireWildcard(require('vscode-debugprotocol'));}var _Breakpoints;

function _load_Breakpoints() {return _Breakpoints = require('./Breakpoints');}var _Breakpoints2;function _load_Breakpoints2() {return _Breakpoints2 = _interopRequireDefault(require('./Breakpoints'));}var _MIProxy;

function _load_MIProxy() {return _MIProxy = _interopRequireDefault(require('./MIProxy'));}var _MIRecord;
function _load_MIRecord() {return _MIRecord = require('./MIRecord');}var _MITypes;
function _load_MITypes() {return _MITypes = require('./MITypes');}function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };} /**
                                                                                                                                                                                                                                                                                                                                                                                                                                 * Copyright (c) 2017-present, Facebook, Inc.
                                                                                                                                                                                                                                                                                                                                                                                                                                 * All rights reserved.
                                                                                                                                                                                                                                                                                                                                                                                                                                 *
                                                                                                                                                                                                                                                                                                                                                                                                                                 * This source code is licensed under the BSD-style license found in the
                                                                                                                                                                                                                                                                                                                                                                                                                                 * LICENSE file in the root directory of this source tree. An additional grant
                                                                                                                                                                                                                                                                                                                                                                                                                                 * of patent rights can be found in the PATENTS file in the same directory.
                                                                                                                                                                                                                                                                                                                                                                                                                                 *
                                                                                                                                                                                                                                                                                                                                                                                                                                 *  strict-local
                                                                                                                                                                                                                                                                                                                                                                                                                                 * @format
                                                                                                                                                                                                                                                                                                                                                                                                                                 */class SourceBreakpoints {



  constructor(client, breakpoints) {
    this._client = client;
    this._breakpoints = breakpoints;
    this._reverseMap = new Map();
  }

  // Returns a map from the requested lines to the breakpoint handles
  // by source and line
  setSourceBreakpoints(path,
  breakpoints)
  {var _this = this;return (0, _asyncToGenerator.default)(function* () {
      const addRemove = _this._computeAddRemoveSets(path, breakpoints);

      if (!_this._client.isConnected()) {
        _this._cacheBreakpointsInConfiguration(path, addRemove);
      } else {
        yield _this._addRemoveBreakpointsViaProxy(path, addRemove);
      }

      return _this._allBreakpointsForPath(path).map(function (bkpt) {return (
          _this._breakpointToProtocolBreakpoint(bkpt));});})();

  }

  // Set pre-configuration breakpoints
  setCachedBreakpoints() {var _this2 = this;return (0, _asyncToGenerator.default)(function* () {
      const cachedBreakpoints = _this2._breakpoints.breakpointsWithNoDebuggerId();

      const results = yield Promise.all(
      cachedBreakpoints.map(function (_) {
        const source = _.source;
        const line = _.line;if (!(
        source != null)) {throw new Error('Invariant violation: "source != null"');}if (!(
        line != null)) {throw new Error('Invariant violation: "line != null"');}

        return _this2._setBreakpoint(source, line, _.condition);
      }));


      results.forEach(function (response, index) {
        if (response.done) {
          const result = (0, (_MITypes || _load_MITypes()).breakInsertResult)(response);
          const bkpt = result.bkpt[0];
          cachedBreakpoints[index].setId(parseInt(bkpt.number, 10));
          if (bkpt.pending == null) {
            cachedBreakpoints[index].setVerified();
          }
        }
      });

      return cachedBreakpoints.
      filter(function (_) {return _.verified;}).
      map(function (_) {return _this2._breakpointToProtocolBreakpoint(_);});})();
  }

  // We are given the set of lines which should be set for a file, not
  // a delta from the current set. We must compute the delta manually
  // to update the MI debugger.
  //
  _computeAddRemoveSets(
  path,
  breakpoints)
  {
    const existingBreakpoints = this._allBreakpointsForPath(path);
    const existingLines = existingBreakpoints.map(_ => {
      const line = _.line;if (!(
      line != null)) {throw new Error('Invariant violation: "line != null"');}
      return line;
    });

    const lines = breakpoints.map(_ => _.line);

    const removeBreakpoints = existingBreakpoints.filter(
    _ => !lines.includes(_.line));


    const addBreakpoints =

    breakpoints.filter(_ => !existingLines.includes(_.line));

    return { addBreakpoints, removeBreakpoints };
  }

  // If we're called before the proxy is set up, we need to cache the breakpoints
  // until gdb is launched
  _cacheBreakpointsInConfiguration(
  path,
  addRemove)
  {
    let forSource = this._reverseMap.get(path);
    if (forSource == null) {
      forSource = new Map();
      this._reverseMap.set(path, forSource);
    }

    for (const bpt of addRemove.removeBreakpoints) {
      if (bpt.line != null) {
        forSource.delete(bpt.line);
        this._breakpoints.removeBreakpoint(bpt);
      }
    }

    addRemove.addBreakpoints.forEach((breakpoint, index) => {
      const line = breakpoint.line;

      const newBreakpoint = new (_Breakpoints || _load_Breakpoints()).Breakpoint(
      null,
      path,
      line,
      breakpoint.condition,
      false);if (!(


      forSource != null)) {throw new Error('Invariant violation: "forSource != null"');}
      forSource.set(line, newBreakpoint);
      this._breakpoints.addBreakpoint(newBreakpoint);
    });
  }

  _addRemoveBreakpointsViaProxy(
  path,
  addRemove)
  {var _this3 = this;return (0, _asyncToGenerator.default)(function* () {
      const promises = [];

      if (addRemove.removeBreakpoints.length !== 0) {
        const removeCommand = `break-delete ${addRemove.removeBreakpoints.
        map(function (_) {return _.id;}).
        join(' ')}`;
        promises.push(_this3._client.sendCommand(removeCommand));
      }

      for (const bkpt of addRemove.addBreakpoints) {
        promises.push(_this3._setBreakpoint(path, bkpt.line, bkpt.condition));
      }

      const results = yield Promise.all(promises);

      if (addRemove.removeBreakpoints.length !== 0) {
        const removeResult = results.shift();if (!(
        removeResult != null)) {throw new Error('Invariant violation: "removeResult != null"');}
        if (removeResult.result.error) {
          // this means our internal state is out of sync with the debugger
          throw new Error(
          `Failed to remove breakpoints which should have existed (${
          (0, (_MITypes || _load_MITypes()).toCommandError)(removeResult).msg
          })`);

        }
      }

      let forSource = _this3._reverseMap.get(path);
      if (forSource == null) {
        forSource = new Map();
        _this3._reverseMap.set(path, forSource);
      }

      for (const bpt of addRemove.removeBreakpoints) {
        if (bpt.line != null) {
          forSource.delete(bpt.line);
          _this3._breakpoints.removeBreakpoint(bpt);
        }
      }

      const failure = results.find(function (_) {return !_.done;});
      if (failure != null) {
        throw new Error(
        `Failed adding new source breakpoints ${(0, (_MITypes || _load_MITypes()).toCommandError)(failure).msg}`);

      }

      results.forEach(function (response, index) {
        const result = (0, (_MITypes || _load_MITypes()).breakInsertResult)(response);
        const bkpt = result.bkpt[0];if (!(
        bkpt != null)) {throw new Error('Invariant violation: "bkpt != null"');}

        // NB gdb will not return the line number of a pending breakpoint, so
        // use the one we were given
        const line = addRemove.addBreakpoints[index].line;

        const breakpoint = new (_Breakpoints || _load_Breakpoints()).Breakpoint(
        parseInt(bkpt.number, 10),
        path,
        line,
        addRemove.addBreakpoints[index].condition,
        bkpt.pending == null);if (!(


        forSource != null)) {throw new Error('Invariant violation: "forSource != null"');}
        forSource.set(line, breakpoint);
        _this3._breakpoints.addBreakpoint(breakpoint);
      });})();
  }

  _setBreakpoint(
  source,
  line,
  condition)
  {var _this4 = this;return (0, _asyncToGenerator.default)(function* () {
      const conditionFlag =
      condition == null || condition.trim() === '' ?
      '' :
      `-c "${condition.replace('"', '\\"')}"`;

      const cmd = `break-insert -f --source ${source} --line ${line} ${conditionFlag}`;
      return _this4._client.sendCommand(cmd);})();
  }

  _allBreakpointsForPath(path) {
    let forSource = this._reverseMap.get(path);
    forSource = forSource != null ? [...forSource] : [];
    return forSource.map(_ => _[1]);
  }

  _breakpointToProtocolBreakpoint(bkpt) {
    const handle = this._breakpoints.handleForBreakpoint(bkpt);if (!(
    handle != null)) {throw new Error('Could not find source breakpoint handle');}if (!(
    bkpt.line != null)) {throw new Error('Invariant violation: "bkpt.line != null"');}

    const bptRet = {
      id: handle,
      verified: bkpt.verified,
      source: {
        sourceReference: 0 },

      line: bkpt.line };

    if (bkpt.source != null) {
      bptRet.source = Object.assign({}, bptRet.source, { path: bkpt.source });
    }
    return bptRet;
  }}exports.default = SourceBreakpoints;