"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function DebugProtocol() {
  const data = _interopRequireWildcard(require("vscode-debugprotocol"));

  DebugProtocol = function () {
    return data;
  };

  return data;
}

function _DebuggerInterface() {
  const data = require("./DebuggerInterface");

  _DebuggerInterface = function () {
    return data;
  };

  return data;
}

function _Format() {
  const data = _interopRequireDefault(require("./Format"));

  _Format = function () {
    return data;
  };

  return data;
}

function _TokenizedLine() {
  const data = _interopRequireDefault(require("./TokenizedLine"));

  _TokenizedLine = function () {
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
 *  strict-local
 * @format
 */
class ListCommand {
  constructor(con, debug) {
    this.name = 'list';
    this.helpText = "[line | source[:line] | @[:line]]: list source file contents. '@' may be used to refer to the source at the current stack frame.";
    this.detailedHelpText = `
list [line | source[:line] | @[:line]]

Lists source files.

With no arguments, list tries to continue displaying the current source file. If
a file has been previously listed, then that is the current source file; otherwise,
the current source file is the file containing the location of the selected stack
frame.

If just a line number is given, then the current source file will be listed starting
at that line.

If just a source file is given, then that file will be listed started at the beginning.
If a line number is also given, then the listing will start at that line.

'@' may be used as a shorthand for the source file of the current location in the
selected stack frame. With no line number, the listing will attempt to center the
current location in the ouput. Otherwise, listing will begin at the given line number.
  `;
    this._source = {};
    this._nextLine = 1;
    this._sourceIsStackFrame = false;
    this._stackFrameLine = 0;
    this._console = con;
    this._debugger = debug;
  }

  async execute(line) {
    const args = line.stringTokens().slice(1);
    let ref;

    switch (args.length) {
      case 0:
        if (this._sourceIsEmpty()) {
          ref = await this._parseSourcePath('@');
        } else {
          ref = {
            source: this._previousSource(),
            line: this._nextLine
          };
        }

        break;

      case 1:
        ref = await this._parseSourcePath(args[0]);
        break;

      default:
        throw new Error(ListCommand._formatError);
    }

    await this._printSourceLines(ref);
  }

  onStopped() {
    // Default behavior if list is re-run is to show more source.
    // When we stop at a breakpoint, reset that state so the first 'list'
    // always shows source around the stop location
    this._source.path = '';
  }

  _previousSource() {
    if (this._sourceIsEmpty()) {
      throw new Error('There is no current source file to list.');
    }

    return this._source;
  }

  async _parseSourcePath(sourceRef) {
    // just line on current source
    let match = sourceRef.match(/^(\d+)$/);

    if (match != null) {
      const [, line] = match;
      return {
        source: this._previousSource(),
        line: parseInt(line, 10)
      };
    } // source:line (where source may be '@' meaning current stack frame source)


    match = sourceRef.match(/^([^:]+)(:(\d+))?$/);

    if (match != null) {
      const [, sourcePath,, lineStr] = match;
      let line = lineStr != null ? parseInt(lineStr, 10) : 1;
      let source = {
        path: sourcePath
      };
      this._sourceIsStackFrame = sourcePath === '@';

      if (this._sourceIsStackFrame) {
        const stackFrame = await this._debugger.getCurrentStackFrame();

        if (stackFrame == null || stackFrame.source == null) {
          throw new Error('Source is not available for the current stack frame.');
        }

        source = stackFrame.source;
        this._stackFrameLine = stackFrame.line;

        if (lineStr == null) {
          // If no line was specified, center around current line in
          // stack frame
          line = Math.max(1, this._stackFrameLine - Math.floor(ListCommand._linesToPrint / 2));
        }
      }

      return {
        source,
        line
      };
    }

    throw new Error(ListCommand._formatError);
  }

  async _printSourceLines(ref) {
    let sourceLines;

    try {
      sourceLines = await this._debugger.getSourceLines(ref.source, ref.line, ListCommand._linesToPrint);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this._console.outputLine('Source file does not exist.');

        return;
      }

      this._console.outputLine('Error reading source file.');

      return;
    }

    if (ref.source.path != null) {
      this._console.outputLine(`Listing ${ref.source.path}`);
    }

    if (sourceLines.length === 0) {
      throw new Error(`No source found at line ${ref.line}.`);
    }

    const maxLineNumber = ref.line + sourceLines.length - 1;
    const maxLength = String(maxLineNumber).length;
    let lineNumber = ref.line;

    for (const sourceLine of sourceLines) {
      let sep = ' |';

      if (this._sourceIsStackFrame && lineNumber === this._stackFrameLine) {
        sep = '=>';
      }

      this._console.outputLine(`${(0, _Format().default)(String(lineNumber), maxLength)}${sep}   ${this._untabifyLine(sourceLine)}`);

      lineNumber++;
    }

    this._source = ref.source;
    this._nextLine = ref.line + sourceLines.length;
  }

  _sourceIsEmpty() {
    return (this._source.path == null || this._source.path === '') && (this._source.sourceReference == null || this._source.sourceReference === 0);
  } // the console itself does tab expansion, but it won't be right because
  // source code is formatted as if the lines start in column 1, which they
  // won't when we write them because of the line number prefix area.


  _untabifyLine(line) {
    const pieces = line.split('\t');

    if (pieces.length === 0) {
      return '';
    }

    let lineOut = pieces[0];

    for (let i = 1; i < pieces.length; i++) {
      const piece = pieces[i];
      const spaces = 8 - lineOut.length % 8;
      lineOut += ' '.repeat(spaces) + piece;
    }

    return lineOut;
  }

}

exports.default = ListCommand;
ListCommand._formatError = "Format is 'list [source[:line]]'.";
ListCommand._linesToPrint = 25;