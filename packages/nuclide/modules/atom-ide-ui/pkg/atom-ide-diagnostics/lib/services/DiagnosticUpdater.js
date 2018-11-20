"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _observable() {
  const data = require("../../../../../nuclide-commons/observable");

  _observable = function () {
    return data;
  };

  return data;
}

function Actions() {
  const data = _interopRequireWildcard(require("../redux/Actions"));

  Actions = function () {
    return data;
  };

  return data;
}

function Selectors() {
  const data = _interopRequireWildcard(require("../redux/Selectors"));

  Selectors = function () {
    return data;
  };

  return data;
}

function _observableFromReduxStore() {
  const data = _interopRequireDefault(require("../../../../../nuclide-commons/observableFromReduxStore"));

  _observableFromReduxStore = function () {
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

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../../../../../nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

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
const THROTTLE_FILE_MESSAGE_MS = 100;

class DiagnosticUpdater {
  constructor(store) {
    this.getMessages = () => {
      return Selectors().getMessages(this._store.getState());
    };

    this.getFileMessageUpdates = filePath => {
      return Selectors().getFileMessageUpdates(this._store.getState(), filePath);
    };

    this.getLastUpdateSource = () => {
      return this._store.getState().lastUpdateSource;
    };

    this.observeMessages = callback => {
      return new (_UniversalDisposable().default)(this._allMessageUpdates.subscribe(callback));
    };

    this.observeFileMessagesIterator = (filePath, callback) => {
      return new (_UniversalDisposable().default)(this._states.distinctUntilChanged((a, b) => a.messages === b.messages).let((0, _observable().throttle)(THROTTLE_FILE_MESSAGE_MS)).map(state => ({
        [Symbol.iterator]() {
          return Selectors().getBoundedThreadedFileMessages(state, filePath);
        }

      })) // $FlowFixMe Flow doesn't know about Symbol.iterator
      .subscribe(callback));
    };

    this.observeFileMessages = (filePath, callback) => {
      return new (_UniversalDisposable().default)( // TODO: As a potential perf improvement, we could cache so the mapping only happens once.
      // Whether that's worth it depends on how often this is actually called with the same path.
      this._states.distinctUntilChanged((a, b) => a.messages === b.messages).let((0, _observable().throttle)(THROTTLE_FILE_MESSAGE_MS)).map(state => Selectors().getFileMessageUpdates(state, filePath)).distinctUntilChanged((a, b) => a.totalMessages === b.totalMessages && (0, _collection().arrayEqual)(a.messages, b.messages)).subscribe(callback));
    };

    this.observeCodeActionsForMessage = callback => {
      return new (_UniversalDisposable().default)(this._states.map(state => state.codeActionsForMessage).distinctUntilChanged().subscribe(callback));
    };

    this.observeDescriptions = callback => {
      return new (_UniversalDisposable().default)(this._states.map(state => state.descriptions).distinctUntilChanged().subscribe(callback));
    };

    this.observeSupportedMessageKinds = callback => {
      return new (_UniversalDisposable().default)(this._states.map(Selectors().getSupportedMessageKinds).subscribe(callback));
    };

    this.observeUiConfig = callback => {
      return new (_UniversalDisposable().default)(this._states.map(Selectors().getUiConfig) // Being a selector means we'll always get the same ui config for a given
      // slice of state (in this case `state.providers`). However, other parts
      // of state may change. Don't emit in those cases, or in the common case
      // that the config changed from an empty array to a different empty array.
      .distinctUntilChanged((a, b) => a === b || a.length === 0 && b.length === 0).subscribe(callback));
    };

    this.applyFix = message => {
      this._store.dispatch(Actions().applyFix(message));
    };

    this.applyFixesForFile = file => {
      this._store.dispatch(Actions().applyFixesForFile(file));
    };

    this.fetchCodeActions = (editor, messages) => {
      this._store.dispatch(Actions().fetchCodeActions(editor, messages));
    };

    this.fetchDescriptions = messages => {
      this._store.dispatch(Actions().fetchDescriptions(messages));
    };

    this._store = store;
    this._states = (0, _observableFromReduxStore().default)(store);
    this._allMessageUpdates = this._states.map(Selectors().getMessages).distinctUntilChanged();
  }

}

exports.default = DiagnosticUpdater;