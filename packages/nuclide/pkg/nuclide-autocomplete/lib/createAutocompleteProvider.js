'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _asyncToGenerator = _interopRequireDefault(require('async-to-generator'));

exports.default = createAutocompleteProvider;

var _promise;

function _load_promise() {
  return _promise = require('../../../modules/nuclide-commons/promise');
}

var _nuclideAnalytics;

function _load_nuclideAnalytics() {
  return _nuclideAnalytics = require('../../nuclide-analytics');
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Autocomplete is extremely critical to the user experience!
 * Don't tolerate anything longer than three seconds; just fail fast and
 * let the fallback providers provide something at least.
 */
const AUTOCOMPLETE_TIMEOUT = 3000; /**
                                    * Copyright (c) 2015-present, Facebook, Inc.
                                    * All rights reserved.
                                    *
                                    * This source code is licensed under the license found in the LICENSE file in
                                    * the root directory of this source tree.
                                    *
                                    * 
                                    * @format
                                    */

function createAutocompleteProvider(provider) {
  const eventNames = getAnalytics(provider);
  // It is safe to cast it to any since AutocompleteProvider is a super type of
  // atom$AutocompleteProvider
  return Object.assign({}, provider, {
    getSuggestions(request) {
      const logObject = {};

      return (0, (_nuclideAnalytics || _load_nuclideAnalytics()).trackTiming)(eventNames.onGetSuggestions, (0, _asyncToGenerator.default)(function* () {
        let result = null;
        if (request.activatedManually) {
          try {
            result = yield provider.getSuggestions(request);
          } catch (e) {
            (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventNames.errorOnGetSuggestions);
          }
        } else {
          try {
            result = yield (0, (_promise || _load_promise()).timeoutPromise)(Promise.resolve(provider.getSuggestions(request)), AUTOCOMPLETE_TIMEOUT);
          } catch (e) {
            if (e instanceof (_promise || _load_promise()).TimedOutError) {
              (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventNames.timeoutOnGetSuggestions);
            } else {
              (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventNames.errorOnGetSuggestions);
            }
          }
        }
        logObject.isEmpty = result == null || result.length === 0;
        return result;
      }), logObject);
    },
    onDidInsertSuggestion(insertedSuggestionArgument) {
      trackOnDidInsertSuggestion(eventNames.onDidInsertSuggestion, provider.analytics.shouldLogInsertedSuggestion, insertedSuggestionArgument);
      const { onDidInsertSuggestion } = provider;
      if (onDidInsertSuggestion) {
        onDidInsertSuggestion(insertedSuggestionArgument);
      }
    }
  });
}

function trackOnDidInsertSuggestion(eventName, shouldLogInsertedSuggestion, insertedSuggestionArgument) {
  if (!shouldLogInsertedSuggestion) {
    (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventName);
    return;
  }

  const { suggestion } = insertedSuggestionArgument;
  const suggestionText = suggestion.text != null ? suggestion.text : suggestion.snippet;
  (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventName, {
    replacementPrefix: suggestion.replacementPrefix,
    suggestionText
  });
}

function getAnalytics(provider) {
  const eventNameFor = eventType => `${provider.analytics.eventName}:autocomplete:${eventType}`;

  return {
    errorOnGetSuggestions: eventNameFor('error-on-get-suggestions'),
    onDidInsertSuggestion: eventNameFor('on-did-insert-suggestion'),
    onGetSuggestions: eventNameFor('on-get-suggestions'),
    timeoutOnGetSuggestions: eventNameFor('timeout-on-get-suggestions')
  };
}