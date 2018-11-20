"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Model = exports.ExceptionBreakpoint = exports.FunctionBreakpoint = exports.Breakpoint = exports.Process = exports.Thread = exports.StackFrame = exports.Scope = exports.Variable = exports.Expression = exports.ExpressionContainer = exports.Source = void 0;

function DebugProtocol() {
  const data = _interopRequireWildcard(require("vscode-debugprotocol"));

  DebugProtocol = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _uuid() {
  const data = _interopRequireDefault(require("uuid"));

  _uuid = function () {
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

var _atom = require("atom");

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../../../../../nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
    return data;
  };

  return data;
}

function _analytics() {
  const data = require("../../../../../nuclide-commons/analytics");

  _analytics = function () {
    return data;
  };

  return data;
}

function _constants() {
  const data = require("../constants");

  _constants = function () {
    return data;
  };

  return data;
}

function _utils() {
  const data = require("../utils");

  _utils = function () {
    return data;
  };

  return data;
}

function _collection() {
  const data = require("../../../../../nuclide-commons/collection");

  _collection = function () {
    return data;
  };

  return data;
}

function _expected() {
  const data = require("../../../../../nuclide-commons/expected");

  _expected = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * 
 * @format
 */

/**
The following debug model implementation was ported from VSCode's debugger implementation
in https://github.com/Microsoft/vscode/tree/master/src/vs/workbench/parts/debug

MIT License

Copyright (c) 2015 - present Microsoft Corporation

All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
class Source {
  constructor(raw, sessionId) {
    if (raw == null) {
      this._raw = {
        name: _constants().UNKNOWN_SOURCE
      };
    } else {
      this._raw = raw;
    }

    if (this._raw.sourceReference != null && this._raw.sourceReference > 0) {
      this.uri = `${_constants().DEBUG_SOURCES_URI}/${sessionId}/${this._raw.sourceReference}/${this._raw.name == null ? _constants().UNKNOWN_SOURCE : this._raw.name}`;
    } else {
      this.uri = this._raw.path || '';
    }

    this.available = this.uri !== '';
  }

  get name() {
    return this._raw.name;
  }

  get origin() {
    return this._raw.origin;
  }

  get presentationHint() {
    return this._raw.presentationHint;
  }

  get raw() {
    return this._raw;
  }

  get reference() {
    return this._raw.sourceReference;
  }

  get inMemory() {
    return this.uri.startsWith(_constants().DEBUG_SOURCES_URI);
  }

  openInEditor() {
    // eslint-disable-next-line nuclide-internal/atom-apis
    return atom.workspace.open(this.uri, {
      searchAllPanes: true,
      pending: true
    });
  }

}

exports.Source = Source;

class ExpressionContainer {
  // Use chunks to support variable paging #9537
  constructor(process, reference, id, namedVariables, indexedVariables, startOfVariables) {
    this.process = process;
    this._reference = reference;
    this._id = id;
    this._namedVariables = namedVariables || 0;
    this._indexedVariables = indexedVariables || 0;
    this._startOfVariables = startOfVariables || 0;
  }

  get reference() {
    return this._reference;
  }

  set reference(value) {
    this._reference = value;
    this._children = null;
  }

  getChildren() {
    if (this._children == null) {
      this._children = this._doGetChildren();
    }

    return this._children;
  }

  async _doGetChildren() {
    if (!this.hasChildren()) {
      return [];
    }

    if (!this.getChildrenInChunks) {
      const variables = await this._fetchVariables();
      return variables;
    } // Check if object has named variables, fetch them independent from indexed variables #9670


    let childrenArray = [];

    if (Boolean(this._namedVariables)) {
      childrenArray = await this._fetchVariables(undefined, undefined, 'named');
    } // Use a dynamic chunk size based on the number of elements #9774


    let chunkSize = ExpressionContainer.BASE_CHUNK_SIZE;

    while (this._indexedVariables > chunkSize * ExpressionContainer.BASE_CHUNK_SIZE) {
      chunkSize *= ExpressionContainer.BASE_CHUNK_SIZE;
    }

    if (this._indexedVariables > chunkSize) {
      // There are a lot of children, create fake intermediate values that represent chunks #9537
      const numberOfChunks = Math.ceil(this._indexedVariables / chunkSize);

      for (let i = 0; i < numberOfChunks; i++) {
        const start = this._startOfVariables + i * chunkSize;
        const count = Math.min(chunkSize, this._indexedVariables - i * chunkSize);
        childrenArray.push(new Variable(this.process, this, this.reference, `[${start}..${start + count - 1}]`, '', '', null, count, {
          kind: 'virtual'
        }, null, true, start));
      }

      return childrenArray;
    }

    const variables = await this._fetchVariables(this._startOfVariables, this._indexedVariables, 'indexed');
    return childrenArray.concat(variables);
  }

  getId() {
    return this._id;
  }

  getValue() {
    return this._value;
  }

  hasChildren() {
    // only variables with reference > 0 have children.
    return this.reference > 0;
  }

  async _fetchVariables(start, count, filter) {
    const process = this.process;

    if (!process) {
      throw new Error("Invariant violation: \"process\"");
    }

    try {
      const response = await process.session.variables({
        variablesReference: this.reference,
        start,
        count,
        filter
      });
      const variables = (0, _collection().distinct)(response.body.variables.filter(v => v != null && v.name), v => v.name);
      return variables.map(v => new Variable(this.process, this, v.variablesReference, v.name, v.evaluateName, v.value, v.namedVariables, v.indexedVariables, v.presentationHint, v.type));
    } catch (e) {
      return [new Variable(this.process, this, 0, null, e.message, '', 0, 0, {
        kind: 'virtual'
      }, null, false)];
    }
  } // The adapter explicitly sents the children count of an expression only if there are lots of children which should be chunked.


  get getChildrenInChunks() {
    return Boolean(this._indexedVariables);
  }

  setValue(value) {
    this._value = value;
    ExpressionContainer.allValues.set(this.getId(), value);
  }

  toString() {
    return this._value;
  }

}

exports.ExpressionContainer = ExpressionContainer;
ExpressionContainer.allValues = new Map();
ExpressionContainer.BASE_CHUNK_SIZE = 100;

class Expression extends ExpressionContainer {
  constructor(name, id = _uuid().default.v4()) {
    super(null, 0, id);
    this.name = name;
    this.available = false;
    this._type = null; // name is not set if the expression is just being added
    // in that case do not set default value to prevent flashing #14499

    if (name) {
      this._value = Expression.DEFAULT_VALUE;
    }
  }

  get type() {
    return this._type;
  }

  async evaluate(process, stackFrame, context) {
    if (process == null || stackFrame == null && context !== 'repl') {
      this._value = context === 'repl' ? 'Please start a debug session to evaluate' : Expression.DEFAULT_VALUE;
      this.available = false;
      this.reference = 0;
      return;
    }

    this.process = process;

    try {
      const response = await process.session.evaluate({
        expression: this.name,
        frameId: stackFrame ? stackFrame.frameId : undefined,
        context
      });
      this.available = response != null && response.body != null;

      if (response && response.body) {
        this._value = response.body.result;
        this.reference = response.body.variablesReference || 0;
        this._namedVariables = response.body.namedVariables || 0;
        this._indexedVariables = response.body.indexedVariables || 0;
        this._type = response.body.type;
      }
    } catch (err) {
      this._value = err.message;
      this.available = false;
      this.reference = 0;
    }
  }

  toString() {
    return `${this.name}\n${this._value}`;
  }

}

exports.Expression = Expression;
Expression.DEFAULT_VALUE = 'not available';

class Variable extends ExpressionContainer {
  // Used to show the error message coming from the adapter when setting the value #7807
  constructor(process, parent, reference, name, evaluateName, value, namedVariables, indexedVariables, presentationHint, type, available = true, _startOfVariables) {
    super(process, reference, // flowlint-next-line sketchy-null-string:off
    `variable:${parent.getId()}:${name || 'no_name'}`, namedVariables, indexedVariables, _startOfVariables);
    this.parent = parent;
    this.name = name == null ? 'no_name' : name;
    this.evaluateName = evaluateName;
    this.presentationHint = presentationHint;
    this._type = type;
    this.available = available;
    this._value = value;
  }

  get type() {
    return this._type;
  }

  async setVariable(value) {
    const process = (0, _nullthrows().default)(this.process);
    (0, _analytics().track)(_constants().AnalyticsEvents.DEBUGGER_EDIT_VARIABLE, {
      language: process.configuration.adapterType
    });

    try {
      const response = await process.session.setVariable({
        name: (0, _nullthrows().default)(this.name),
        value,
        variablesReference: this.parent.reference
      });

      if (response && response.body) {
        this._value = response.body.value;
        this._type = response.body.type == null ? this._type : response.body.type;
        this.reference = response.body.variablesReference || 0;
        this._namedVariables = response.body.namedVariables || 0;
        this._indexedVariables = response.body.indexedVariables || 0;
      }
    } catch (err) {
      this.errorMessage = err.message;
    }
  }

  toString() {
    return `${this.name}: ${this._value}`;
  }

}

exports.Variable = Variable;

class Scope extends ExpressionContainer {
  constructor(stackFrame, index, name, reference, expensive, namedVariables, indexedVariables, range) {
    super(stackFrame.thread.process, reference, `scope:${stackFrame.getId()}:${name}:${index}`, namedVariables, indexedVariables);
    this.name = name;
    this.expensive = expensive;
    this.range = range;
  }

}

exports.Scope = Scope;

class StackFrame {
  constructor(thread, frameId, source, name, presentationHint, range, index) {
    this.thread = thread;
    this.frameId = frameId;
    this.source = source;
    this.name = name;
    this.presentationHint = presentationHint;
    this.range = range;
    this.index = index;
    this.scopes = null;
  }

  getId() {
    return `stackframe:${this.thread.getId()}:${this.frameId}:${this.index}`;
  }

  async getScopes(forceRefresh) {
    if (this.scopes == null || forceRefresh) {
      this.scopes = this._getScopesImpl();
    }

    return this.scopes;
  }

  async _getScopesImpl() {
    try {
      const {
        body: {
          scopes
        }
      } = await this.thread.process.session.scopes({
        frameId: this.frameId
      });
      return scopes.map((rs, index) => new Scope(this, index, rs.name, rs.variablesReference, rs.expensive, rs.namedVariables, rs.indexedVariables, rs.line != null ? new _atom.Range([rs.line - 1, (rs.column != null ? rs.column : 1) - 1], [(rs.endLine != null ? rs.endLine : rs.line) - 1, (rs.endColumn != null ? rs.endColumn : 1) - 1]) : null));
    } catch (err) {
      return [];
    }
  }

  async getMostSpecificScopes(range) {
    const scopes = (await this.getScopes(false)).filter(s => !s.expensive);
    const haveRangeInfo = scopes.some(s => s.range != null);

    if (!haveRangeInfo) {
      return scopes;
    }

    const scopesContainingRange = scopes.filter(scope => scope.range != null && scope.range.containsRange(range)).sort((first, second) => {
      const firstRange = (0, _nullthrows().default)(first.range);
      const secondRange = (0, _nullthrows().default)(second.range); // prettier-ignore

      return firstRange.end.row - firstRange.start.row - (secondRange.end.row - secondRange.end.row);
    });
    return scopesContainingRange.length ? scopesContainingRange : scopes;
  }

  async restart() {
    await this.thread.process.session.restartFrame({
      frameId: this.frameId
    }, this.thread.threadId);
  }

  toString() {
    return `${this.name} (${this.source.inMemory ? (0, _nullthrows().default)(this.source.name) : this.source.uri}:${this.range.start.row})`;
  }

  async openInEditor() {
    if (this.source.available) {
      return (0, _utils().openSourceLocation)(this.source.uri, this.range.start.row);
    } else {
      return null;
    }
  }

}

exports.StackFrame = StackFrame;

class Thread {
  constructor(process, name, threadId) {
    this.process = process;
    this.name = name;
    this.threadId = threadId;
    this.stoppedDetails = null;
    this._callStack = this._getEmptyCallstackState();
    this.stopped = false;
    this._refreshInProgress = false;
  }

  _getEmptyCallstackState() {
    return {
      valid: false,
      callFrames: []
    };
  }

  _isCallstackLoaded() {
    return this._callStack.valid;
  }

  _isCallstackFullyLoaded() {
    return this._isCallstackLoaded() && this.stoppedDetails != null && this.stoppedDetails.totalFrames != null && !Number.isNaN(this.stoppedDetails.totalFrames) && this.stoppedDetails.totalFrames >= 0 && this._callStack.callFrames.length >= this.stoppedDetails.totalFrames;
  }

  getId() {
    return `thread:${this.process.getId()}:${this.threadId}`;
  }

  additionalFramesAvailable(currentFrameCount) {
    if (this._callStack.callFrames.length > currentFrameCount) {
      return true;
    }

    const supportsDelayLoading = (0, _nullthrows().default)(this.process).session.capabilities.supportsDelayedStackTraceLoading === true;

    if (supportsDelayLoading && this.stoppedDetails != null && this.stoppedDetails.totalFrames != null && this.stoppedDetails.totalFrames > currentFrameCount) {
      return true;
    }

    return false;
  }

  clearCallStack() {
    this._callStack = this._getEmptyCallstackState();
  }

  getCallStackTopFrame() {
    return this._isCallstackLoaded() ? this._callStack.callFrames[0] : null;
  }

  getFullCallStack(levels) {
    if (this._refreshInProgress || this._isCallstackFullyLoaded() || levels != null && this._isCallstackLoaded() && this._callStack.callFrames.length >= levels) {
      // We have a sufficent call stack already loaded, just return it.
      return _rxjsCompatUmdMin.Observable.of(_expected().Expect.value(this._callStack.callFrames));
    } // Return a pending value and kick off the fetch. When the fetch
    // is done, emit the new call frames.


    return _rxjsCompatUmdMin.Observable.concat(_rxjsCompatUmdMin.Observable.of(_expected().Expect.pending()), _rxjsCompatUmdMin.Observable.fromPromise(this.refreshCallStack(levels)).switchMap(() => _rxjsCompatUmdMin.Observable.of(_expected().Expect.value(this._callStack.callFrames))));
  }

  getCachedCallStack() {
    return this._callStack.callFrames;
  }
  /**
   * Queries the debug adapter for the callstack and returns a promise
   * which completes once the call stack has been retrieved.
   * If the thread is not stopped, it returns a promise to an empty array.
   *
   * If specified, levels indicates the maximum depth of call frames to fetch.
   */


  async refreshCallStack(levels) {
    if (!this.stopped) {
      return;
    }

    const supportsDelayLoading = (0, _nullthrows().default)(this.process).session.capabilities.supportsDelayedStackTraceLoading === true;
    this._refreshInProgress = true;

    try {
      if (supportsDelayLoading) {
        const start = this._callStack.callFrames.length;
        const callStack = await this._getCallStackImpl(start, levels);

        if (start < this._callStack.callFrames.length) {
          // Set the stack frames for exact position we requested.
          // To make sure no concurrent requests create duplicate stack frames #30660
          this._callStack.callFrames.splice(start, this._callStack.callFrames.length - start);
        }

        this._callStack.callFrames = this._callStack.callFrames.concat(callStack || []);
      } else {
        // Must load the entire call stack, the debugger backend doesn't support
        // delayed call stack loading.
        this._callStack.callFrames = (await this._getCallStackImpl(0, null)) || [];
      }

      this._callStack.valid = true;
    } finally {
      this._refreshInProgress = false;
    }
  }

  async _getCallStackImpl(startFrame, levels) {
    try {
      const stackTraceArgs = {
        threadId: this.threadId,
        startFrame
      }; // Only include levels if specified and supported. If levels is omitted,
      // the debug adapter is to return all stack frames, per the protocol.

      if (levels != null) {
        stackTraceArgs.levels = levels;
      }

      const response = await this.process.session.stackTrace(stackTraceArgs);

      if (response == null || response.body == null) {
        return [];
      }

      if (this.stoppedDetails != null) {
        this.stoppedDetails.totalFrames = response.body.totalFrames;
      }

      return response.body.stackFrames.map((rsf, index) => {
        const source = this.process.getSource(rsf.source);
        return new StackFrame(this, rsf.id, source, rsf.name, rsf.presentationHint, // The UI is 0-based while VSP is 1-based.
        new _atom.Range([rsf.line - 1, (rsf.column || 1) - 1], [(rsf.endLine != null ? rsf.endLine : rsf.line) - 1, (rsf.endColumn != null ? rsf.endColumn : 1) - 1]), startFrame + index);
      });
    } catch (err) {
      if (this.stoppedDetails != null) {
        this.stoppedDetails.framesErrorMessage = err.message;
      }

      return [];
    }
  }
  /**
   * Returns exception info promise if the exception was thrown, otherwise null
   */


  async exceptionInfo() {
    const session = this.process.session;

    if (this.stoppedDetails == null || this.stoppedDetails.reason !== 'exception') {
      return null;
    }

    const stoppedDetails = this.stoppedDetails;

    if (!session.capabilities.supportsExceptionInfoRequest) {
      return {
        id: null,
        details: null,
        description: stoppedDetails.description,
        breakMode: null
      };
    }

    const exception = await session.exceptionInfo({
      threadId: this.threadId
    });

    if (exception == null) {
      return null;
    }

    return {
      id: exception.body.exceptionId,
      description: exception.body.description,
      breakMode: exception.body.breakMode,
      details: exception.body.details
    };
  }

  async next() {
    (0, _analytics().track)(_constants().AnalyticsEvents.DEBUGGER_STEP_OVER);
    await this.process.session.next({
      threadId: this.threadId
    });
  }

  async stepIn() {
    (0, _analytics().track)(_constants().AnalyticsEvents.DEBUGGER_STEP_INTO);
    await this.process.session.stepIn({
      threadId: this.threadId
    });
  }

  async stepOut() {
    (0, _analytics().track)(_constants().AnalyticsEvents.DEBUGGER_STEP_OUT);
    await this.process.session.stepOut({
      threadId: this.threadId
    });
  }

  async stepBack() {
    (0, _analytics().track)(_constants().AnalyticsEvents.DEBUGGER_STEP_BACK);
    await this.process.session.stepBack({
      threadId: this.threadId
    });
  }

  async continue() {
    (0, _analytics().track)(_constants().AnalyticsEvents.DEBUGGER_STEP_CONTINUE);
    await this.process.session.continue({
      threadId: this.threadId
    });
  }

  async pause() {
    (0, _analytics().track)(_constants().AnalyticsEvents.DEBUGGER_STEP_PAUSE);
    await this.process.session.pause({
      threadId: this.threadId
    });
  }

  async reverseContinue() {
    await this.process.session.reverseContinue({
      threadId: this.threadId
    });
  }

}

exports.Thread = Thread;

class Process {
  constructor(configuration, session) {
    this._configuration = configuration;
    this._session = session;
    this._threads = new Map();
    this._sources = new Map();
    this._pendingStart = true;
    this._pendingStop = false;
    this.breakpoints = [];
    this.exceptionBreakpoints = [];
  }

  get sources() {
    return this._sources;
  }

  get session() {
    return this._session;
  }

  get configuration() {
    return this._configuration;
  }

  get debuggerMode() {
    if (this._pendingStart) {
      return _constants().DebuggerMode.STARTING;
    }

    if (this._pendingStop) {
      return _constants().DebuggerMode.STOPPING;
    }

    if (this.getAllThreads().some(t => t.stopped)) {
      // TOOD: Currently our UX controls support resume and async-break
      // on a per-process basis only. This needs to be modified here if
      // we add support for freezing and resuming individual threads.
      return _constants().DebuggerMode.PAUSED;
    }

    return _constants().DebuggerMode.RUNNING;
  }

  clearProcessStartingFlag() {
    this._pendingStart = false;
  }

  setStopPending() {
    this._pendingStop = true;
  }

  getSource(raw) {
    let source = new Source(raw, this.getId());

    if (this._sources.has(source.uri)) {
      source = (0, _nullthrows().default)(this._sources.get(source.uri));
    } else {
      this._sources.set(source.uri, source);
    }

    return source;
  }

  getThread(threadId) {
    return this._threads.get(threadId);
  }

  getAllThreads() {
    return Array.from(this._threads.values());
  }

  getId() {
    return this._session.getId();
  }

  rawStoppedUpdate(data) {
    const {
      threadId,
      stoppedDetails
    } = data;
    this.clearProcessStartingFlag();

    if (threadId != null && !this._threads.has(threadId)) {
      // We're being asked to update a thread we haven't seen yet, so
      // create it
      const thread = new Thread(this, `Thread ${threadId}`, threadId);

      this._threads.set(threadId, thread);
    } // Set the availability of the threads' callstacks depending on
    // whether the thread is stopped or not


    if (stoppedDetails.allThreadsStopped) {
      this._threads.forEach(thread => {
        thread.stoppedDetails = thread.threadId === threadId ? stoppedDetails : thread.stoppedDetails;
        thread.stopped = true;
        thread.clearCallStack();
      });
    } else if (threadId != null) {
      // One thread is stopped, only update that thread.
      const thread = (0, _nullthrows().default)(this._threads.get(threadId));
      thread.stoppedDetails = stoppedDetails;
      thread.clearCallStack();
      thread.stopped = true;
    }
  }

  rawThreadUpdate(data) {
    const {
      thread
    } = data;
    this.clearProcessStartingFlag();

    if (!this._threads.has(thread.id)) {
      // A new thread came in, initialize it.
      this._threads.set(thread.id, new Thread(this, thread.name, thread.id));
    } else if (thread.name) {
      // Just the thread name got updated #18244
      (0, _nullthrows().default)(this._threads.get(thread.id)).name = thread.name;
    }
  }

  clearThreads(removeThreads, reference) {
    if (reference != null) {
      if (this._threads.has(reference)) {
        const thread = (0, _nullthrows().default)(this._threads.get(reference));
        thread.clearCallStack();
        thread.stoppedDetails = null;
        thread.stopped = false;

        if (removeThreads) {
          this._threads.delete(reference);
        }
      }
    } else {
      this._threads.forEach(thread => {
        thread.clearCallStack();
        thread.stoppedDetails = null;
        thread.stopped = false;
      });

      if (removeThreads) {
        this._threads.clear();

        ExpressionContainer.allValues.clear();
      }
    }
  }

  async completions(frameId, text, position, overwriteBefore) {
    if (!this._session.capabilities.supportsCompletionsRequest) {
      return [];
    }

    try {
      const response = await this._session.completions({
        frameId,
        text,
        column: position.column,
        line: position.row
      });

      if (response && response.body && response.body.targets) {
        return response.body.targets;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }

}

exports.Process = Process;

class Breakpoint {
  constructor(uiBreakpointId, uri, line, column, enabled, condition, adapterData) {
    this.uri = uri;
    this.line = line;
    this.originalLine = line;
    this.column = column;
    this.enabled = enabled;
    this.condition = condition;
    this.adapterData = adapterData;
    this.verified = false;
    this.uiBreakpointId = uiBreakpointId;
    this.hitCount = null;

    if (condition != null && condition.trim() !== '') {
      this.condition = condition;
    } else {
      this.condition = null;
    }
  }

  getId() {
    return this.uiBreakpointId;
  }

}

exports.Breakpoint = Breakpoint;

class FunctionBreakpoint {
  constructor(name, enabled, hitCondition) {
    this.name = name;
    this.enabled = enabled;
    this.hitCondition = hitCondition;
    this.condition = null;
    this.verified = false;
    this.idFromAdapter = null;
    this.id = _uuid().default.v4();
  }

  getId() {
    return this.id;
  }

}

exports.FunctionBreakpoint = FunctionBreakpoint;

class ExceptionBreakpoint {
  constructor(filter, label, enabled) {
    this.filter = filter;
    this.label = label;
    this.enabled = enabled == null ? false : enabled;
    this._id = _uuid().default.v4();
  }

  getId() {
    return this._id;
  }

}

exports.ExceptionBreakpoint = ExceptionBreakpoint;
const BREAKPOINTS_CHANGED = 'BREAKPOINTS_CHANGED';
const WATCH_EXPRESSIONS_CHANGED = 'WATCH_EXPRESSIONS_CHANGED';
const CALLSTACK_CHANGED = 'CALLSTACK_CHANGED';
const PROCESSES_CHANGED = 'PROCESSES_CHANGED';

class Model {
  // Exception breakpoint filters are different for each debugger back-end, so they
  // are process-specific. However, when we're not debugging, ideally we'd want to still
  // show filters so that a user can set break on exception before starting debugging, to
  // enable breaking on early exceptions as the target starts. For this reason, we cache
  // whatever options the most recently focused process offered, and offer those.
  constructor(uiBreakpoints, breakpointsActivated, functionBreakpoints, exceptionBreakpoints, watchExpressions, getFocusedProcess) {
    this._processes = [];
    this._uiBreakpoints = uiBreakpoints;
    this._breakpointsActivated = breakpointsActivated;
    this._functionBreakpoints = functionBreakpoints;
    this._mostRecentExceptionBreakpoints = exceptionBreakpoints;
    this._watchExpressions = watchExpressions;
    this._getFocusedProcess = getFocusedProcess;
    this._emitter = new _atom.Emitter();
    this._disposables = new (_UniversalDisposable().default)(this._emitter);
  }

  getId() {
    return 'root';
  }

  getProcesses() {
    return this._processes;
  }

  addProcess(configuration, session) {
    const process = new Process(configuration, session); // Add breakpoints to process.

    const processBreakpoints = process.breakpoints;

    for (const uiBp of this._uiBreakpoints) {
      processBreakpoints.push(new Breakpoint(uiBp.id, uiBp.uri, uiBp.line, uiBp.column, uiBp.enabled, uiBp.condition));
    }

    this._processes.push(process);

    this._emitter.emit(PROCESSES_CHANGED);

    return process;
  }

  removeProcess(id) {
    const removedProcesses = [];
    this._processes = this._processes.filter(p => {
      if (p.getId() === id) {
        removedProcesses.push(p);
        return false;
      } else {
        return true;
      }
    });

    this._emitter.emit(PROCESSES_CHANGED);

    if (removedProcesses.length > 0) {
      this._mostRecentExceptionBreakpoints = removedProcesses[0].exceptionBreakpoints;
    }

    return removedProcesses;
  }

  onDidChangeBreakpoints(callback) {
    return this._emitter.on(BREAKPOINTS_CHANGED, callback);
  } // TODO: Scope this so that only the tree nodes for the process that
  // had a call stack change need to re-render


  onDidChangeCallStack(callback) {
    return this._emitter.on(CALLSTACK_CHANGED, callback);
  }

  onDidChangeProcesses(callback) {
    return this._emitter.on(PROCESSES_CHANGED, callback);
  }

  onDidChangeWatchExpressions(callback) {
    return this._emitter.on(WATCH_EXPRESSIONS_CHANGED, callback);
  }

  rawUpdate(data) {
    const process = this._processes.filter(p => p.getId() === data.sessionId).pop();

    if (process == null) {
      return;
    }

    if (data.stoppedDetails != null) {
      process.rawStoppedUpdate(data);
    } else {
      process.rawThreadUpdate(data);
    }

    this._emitter.emit(CALLSTACK_CHANGED);
  }

  clearThreads(id, removeThreads, reference) {
    const process = this._processes.filter(p => p.getId() === id).pop();

    if (process != null) {
      process.clearThreads(removeThreads, reference);

      this._emitter.emit(CALLSTACK_CHANGED);
    }
  }

  async refreshCallStack(threadI, fetchAllFrames) {
    const thread = threadI; // If the debugger supports delayed stack trace loading, load only
    // the first call stack frame, which is needed to display in the threads
    // view. We will lazily load the remaining frames only for threads that
    // are visible in the UI, allowing us to skip loading frames we don't
    // need right now.

    const framesToLoad = (0, _nullthrows().default)(thread.process).session.capabilities.supportsDelayedStackTraceLoading && !fetchAllFrames ? 1 : null;
    thread.clearCallStack();
    await thread.refreshCallStack(framesToLoad);

    this._emitter.emit(CALLSTACK_CHANGED);
  }

  getUIBreakpoints() {
    return this._uiBreakpoints;
  }

  getBreakpoints() {
    // If we're currently debugging, return the breakpoints as the current
    // debug adapter sees them.
    const focusedProcess = this._getFocusedProcess();

    if (focusedProcess != null) {
      const currentProcess = this._processes.find(p => p.getId() === focusedProcess.getId());

      if (currentProcess != null) {
        return currentProcess.breakpoints;
      }
    } // Otherwise, return the UI breakpoints. Since there is no debug process,
    // the breakpoints have their original line location and no notion of
    // verified vs not.


    return this._uiBreakpoints.map(uiBp => {
      const bp = new Breakpoint(uiBp.id, uiBp.uri, uiBp.line, uiBp.column, uiBp.enabled, uiBp.condition);
      bp.verified = true;
      return bp;
    });
  }

  getBreakpointAtLine(uri, line) {
    let breakpoint = this.getBreakpoints().find(bp => bp.uri === uri && bp.line === line);

    if (breakpoint == null) {
      breakpoint = this.getBreakpoints().find(bp => bp.uri === uri && bp.originalLine === line);
    }

    return breakpoint;
  }

  getBreakpointById(id) {
    return this.getBreakpoints().find(bp => bp.getId() === id);
  }

  getFunctionBreakpoints() {
    return this._functionBreakpoints;
  }

  getExceptionBreakpoints() {
    const focusedProcess = this._getFocusedProcess();

    if (focusedProcess != null) {
      return focusedProcess.exceptionBreakpoints;
    }

    return this._mostRecentExceptionBreakpoints;
  }

  setExceptionBreakpoints(process, data) {
    process.exceptionBreakpoints = data.map(d => {
      const ebp = process.exceptionBreakpoints.filter(bp => bp.filter === d.filter).pop();
      return new ExceptionBreakpoint(d.filter, d.label, ebp ? ebp.enabled : d.default);
    });

    this._emitter.emit(BREAKPOINTS_CHANGED);
  }

  areBreakpointsActivated() {
    return this._breakpointsActivated;
  }

  setBreakpointsActivated(activated) {
    this._breakpointsActivated = activated;

    this._emitter.emit(BREAKPOINTS_CHANGED);
  }

  addUIBreakpoints(uiBreakpoints, fireEvent = true) {
    this._uiBreakpoints = this._uiBreakpoints.concat(uiBreakpoints);
    this._breakpointsActivated = true;

    this._sortSyncAndDeDup({
      fireEvent
    });
  }

  removeBreakpoints(toRemove) {
    this._uiBreakpoints = this._uiBreakpoints.filter(bp => !toRemove.some(r => r.getId() === bp.id));

    this._sortSyncAndDeDup();
  }

  updateBreakpoints(newBps) {
    this._uiBreakpoints = this._uiBreakpoints.filter(bp => !newBps.some(n => n.id === bp.id)).concat(newBps);

    this._sortSyncAndDeDup();
  } // This is called when a breakpoint is updated by the debug adapter.
  // It affects only breakpoints for a particular session.


  updateProcessBreakpoints(process, data) {
    const proc = this._processes.find(p => p.getId() === process.getId());

    if (proc == null) {
      return;
    }

    const breakpoints = proc.breakpoints;
    breakpoints.forEach(bp => {
      const bpData = data[bp.getId()];

      if (bpData != null) {
        // The breakpoint's calibrated location can be different from its
        // initial location. Since we don't display ranges in the UX, a bp
        // has only one line location. We prefer the endLine if the bp instruction
        // matches a range of lines. Otherwise fall back to the (start) line.
        bp.line = bpData.endLine != null ? bpData.endLine : bpData.line != null ? bpData.line : bp.line;
        bp.column = bpData.column != null ? bpData.column : bp.column;
        bp.verified = bpData.verified != null ? bpData.verified : bp.verified;
        bp.idFromAdapter = bpData.id;
        bp.adapterData = bpData.source ? bpData.source.adapterData : bp.adapterData;
        bp.hitCount = bpData.nuclide_hitCount;
      }
    });

    this._sortSyncAndDeDup();
  }

  _sortSyncAndDeDup(options) {
    const comparer = (first, second) => {
      if (first.uri !== second.uri) {
        return first.uri.localeCompare(second.uri);
      }

      if (first.line === second.line) {
        return first.column - second.column;
      }

      return first.line - second.line;
    };

    this._uiBreakpoints = (0, _collection().distinct)(this._uiBreakpoints.sort(comparer), bp => `${bp.uri}:${bp.line}:${bp.column}`); // Sync with all active processes.

    const bpIds = new Set();

    for (const bp of this._uiBreakpoints) {
      bpIds.add(bp.id);
    }

    for (const process of this._processes) {
      // Remove any breakpoints from the process that no longer exist in the UI.
      process.breakpoints = process.breakpoints.filter(bp => bpIds.has(bp.getId())); // Sync any to the process that are missing.

      const processBps = new Map();

      for (const processBreakpoint of process.breakpoints) {
        processBps.set(processBreakpoint.getId(), processBreakpoint);
      }

      for (const uiBp of this._uiBreakpoints) {
        const processBp = processBps.get(uiBp.id);

        if (processBp == null) {
          process.breakpoints.push(new Breakpoint(uiBp.id, uiBp.uri, uiBp.line, uiBp.column, uiBp.enabled, uiBp.condition));
        } else {
          processBp.enabled = uiBp.enabled;
          processBp.condition = uiBp.condition;
        }
      } // Sort.


      process.breakpoints = process.breakpoints.sort(comparer);
    }

    if (options == null || options.fireEvent) {
      this._emitter.emit(BREAKPOINTS_CHANGED);
    }
  }

  setEnablement(element, enable) {
    element.enabled = enable;

    const uiBp = this._uiBreakpoints.find(bp => bp.id === element.getId());

    if (uiBp != null) {
      uiBp.enabled = enable;
    }

    this._sortSyncAndDeDup();
  }

  enableOrDisableAllBreakpoints(enable) {
    this._uiBreakpoints.forEach(bp => {
      bp.enabled = enable;
    });

    this._functionBreakpoints.forEach(fbp => {
      fbp.enabled = enable;
    });

    this._sortSyncAndDeDup();
  }

  addFunctionBreakpoint(functionName) {
    const newFunctionBreakpoint = new FunctionBreakpoint(functionName, true, null);

    this._functionBreakpoints.push(newFunctionBreakpoint);

    this._emitter.emit(BREAKPOINTS_CHANGED);

    return newFunctionBreakpoint;
  }

  updateFunctionBreakpoints(data) {
    this._functionBreakpoints.forEach(fbp => {
      const fbpData = data[fbp.getId()];

      if (fbpData != null) {
        fbp.name = fbpData.name != null ? fbpData.name : fbp.name;
        fbp.verified = fbpData.verified || fbp.verified;
        fbp.idFromAdapter = fbpData.id;
        fbp.hitCondition = fbpData.hitCondition;
      }
    });

    this._emitter.emit(BREAKPOINTS_CHANGED);
  }

  removeFunctionBreakpoints(id) {
    let removed;

    if (id != null) {
      removed = this._functionBreakpoints.filter(fbp => fbp.getId() === id);
      this._functionBreakpoints = this._functionBreakpoints.filter(fbp => fbp.getId() !== id);
    } else {
      removed = this._functionBreakpoints;
      this._functionBreakpoints = [];
    }

    this._emitter.emit(BREAKPOINTS_CHANGED, {
      removed
    });
  }

  getWatchExpressions() {
    return this._watchExpressions;
  }

  addWatchExpression(name) {
    const we = new Expression(name);

    this._watchExpressions.push(we);

    this._emitter.emit(WATCH_EXPRESSIONS_CHANGED, we);
  }

  renameWatchExpression(id, newName) {
    const filtered = this._watchExpressions.filter(we => we.getId() === id);

    if (filtered.length === 1) {
      filtered[0].name = newName;

      this._emitter.emit(WATCH_EXPRESSIONS_CHANGED, filtered[0]);
    }
  }

  removeWatchExpressions(id) {
    this._watchExpressions = id != null ? this._watchExpressions.filter(we => we.getId() !== id) : [];

    this._emitter.emit(WATCH_EXPRESSIONS_CHANGED);
  }

  sourceIsNotAvailable(uri) {
    this._processes.forEach(p => {
      if (p.sources.has(uri)) {
        (0, _nullthrows().default)(p.sources.get(uri)).available = false;
      }
    });

    this._emitter.emit(CALLSTACK_CHANGED);
  }

  dispose() {
    this._disposables.dispose();
  }

}

exports.Model = Model;