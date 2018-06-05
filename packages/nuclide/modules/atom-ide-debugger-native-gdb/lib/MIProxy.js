'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _child_process = _interopRequireWildcard(require('child_process'));

var _MIDebugSession;

function _load_MIDebugSession() {
  return _MIDebugSession = require('./MIDebugSession');
}

var _MILineParser;

function _load_MILineParser() {
  return _MILineParser = _interopRequireDefault(require('./MILineParser'));
}

var _MIRecord;

function _load_MIRecord() {
  return _MIRecord = require('./MIRecord');
}

var _events = _interopRequireDefault(require('events'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

class MIProxy extends _events.default {

  constructor() {
    super();

    this._parser = new (_MILineParser || _load_MILineParser()).default();
    this._nextToken = 1;
    this._lastPartialString = '';
    this._pendingCommands = new Map();
  }

  isConnected() {
    return this._miServer != null;
  }

  start(executable, args, env) {
    if (this._miServer != null) {
      this.stop();
    }

    let options = {};
    if (env != null) {
      options = Object.assign({}, options, {
        env: Object.assign({}, process.env, env)
      });
    }

    const proc = _child_process.spawn(executable, args, options);
    this._miServer = proc;

    proc.stdout.on('data', buffer => this._onData(buffer));
    proc.on('error', err => {
      this.emit('error', err);
    });
    proc.on('exit', () => {
      this.emit('exit');
    });
  }

  pause() {
    const server = this._miServer;
    if (server == null) {
      return;
    }

    server.kill('SIGINT');
  }

  stop() {
    if (this._miServer != null) {
      this._miServer.disconnect();
      this._miServer = null;
    }
  }

  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      const dbg = this._miServer;
      if (dbg == null) {
        reject(new Error('Attempt to send a command when no MI server connected'));
        return;
      }

      const token = this._nextToken++;
      const pendingCommand = {
        command,
        token,
        resolve: record => {}
      };
      pendingCommand.resolve = resolve;
      this._pendingCommands.set(token, pendingCommand);
      const tokenizedCommand = `${token}-${command}\n`;
      (0, (_MIDebugSession || _load_MIDebugSession()).logVerbose)(`MIProxy sending command '${tokenizedCommand}' to server`);
      dbg.stdin.write(tokenizedCommand);
    });
  }

  _onData(buffer) {
    // NB data coming back from gdb will be ASCII, and data from the target
    const str = this._lastPartialString + buffer.toString('ASCII');

    const tailSplit = str.lastIndexOf('\n');
    if (tailSplit === -1) {
      this._lastPartialString = str;
      return;
    }

    this._lastPartialString = str.substr(tailSplit + 1);
    str.substr(0, tailSplit).split('\n').forEach(line => this._onLine(line.trim()));
  }

  _onLine(line) {
    if (line === '') {
      return;
    }

    (0, (_MIDebugSession || _load_MIDebugSession()).logVerbose)(`proxy received line ${line}`);
    const parsed = this._parser.parseMILine(line);
    this._emitRecord(parsed, line);
  }

  _emitRecord(record, line) {
    if (record instanceof (_MIRecord || _load_MIRecord()).MIResultRecord) {
      const token = record.token;

      if (!(token != null)) {
        throw new Error('token should always exist in a result record');
      }

      const pending = this._pendingCommands.get(token);
      if (pending != null) {
        pending.resolve(record);
        this._pendingCommands.delete(token);
        return;
      }
      throw new Error(`Received response with token ${token} which matches no pending command`);
    }

    if (record instanceof (_MIRecord || _load_MIRecord()).MIAsyncRecord) {
      this.emit('async', record);
    } else if (record instanceof (_MIRecord || _load_MIRecord()).MIStreamRecord) {
      if (!this._hackForAttachPermissions(record)) {
        this.emit('stream', record);
      }
    }
  }

  _hackForAttachPermissions(record) {
    if (record.streamTarget !== 'log') {
      return false;
    }

    if (record.text.match(/Could not attach to process/i) == null) {
      return false;
    }

    const attach = [...this._pendingCommands].find(_ => _[1].command.match(/target-attach/) != null);

    if (attach == null) {
      return false;
    }

    const [token, command] = attach;

    // Modern versions of linux default to a locked down security model for
    // ptrace where ptrace can only attach to a child process. A sysctl call
    // must be made in order to get the old behavior, which gdb target-attach
    // depends on, of being able to ptrace any process owned by the user.
    // Unfortunately the target-attach command does not send back a proper
    // MI failure in this case; it prints a message to the log saying how
    // to fix the problem but the command never actually completes. Hence
    // this hack...
    const failure = new (_MIRecord || _load_MIRecord()).MIResultRecord(token, { msg: record.text.replace('\n', ' ') }, 'error');
    command.resolve(failure);
    this._pendingCommands.delete(token);

    return true;
  }
}
exports.default = MIProxy; /**
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