'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createAutocompleteProvider;

var _performanceNow;

function _load_performanceNow() {
  return _performanceNow = _interopRequireDefault(require('../../../modules/nuclide-commons/performanceNow'));
}

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
 * Don't tolerate anything longer than AUTOCOMPLETE_TIMEOUT seconds; just fail
 * fast and let the fallback providers provide something at least.
 *
 * NOTE: We keep a higher time limit for only testing envirnoment since the
 * autocomplete check happens right after you open the file and providers don't
 * have enough time to initialize.
 */
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * 
 * @format
 */

const AUTOCOMPLETE_TIMEOUT = atom.inSpecMode() ? 3000 : 500;

const durationBySuggestion = new WeakMap();

/**
 * Receives a provider and returns a proxy provider that applies time limit to
 * `getSuggestions` calls and stop unhandled exceptions on to cascade.
 */
function createAutocompleteProvider(provider) {
  // The `eventNames` could be computed in deep functions, but we don't want
  // to change the logger if a provider decides to changes its name.
  const eventNames = getAnalytics(provider);
  const proxy = new Proxy(provider, {
    get: (target, prop, receiver) => {
      switch (prop) {
        case 'getSuggestions':
          return getSuggestions.bind(null, target, eventNames);
        case 'onDidInsertSuggestion':
          return onDidInsertSuggestion.bind(null, target, eventNames);
        case 'getSuggestionDetailsOnSelect':
          if (target.getSuggestionDetailsOnSelect != null) {
            return getSuggestionDetailsOnSelect.bind(null, target, eventNames);
          } else {
            return () => Promise.resolve(null);
          }
        default:
          return Reflect.get(target, prop, receiver);
      }
    }
  });

  // It is safe to cast it to any since AutocompleteProvider is a super type of
  // atom$AutocompleteProvider
  return proxy;
}

function getSuggestions(provider, eventNames, request) {
  const logObject = {};

  return (0, (_nuclideAnalytics || _load_nuclideAnalytics()).trackTiming)(eventNames.onGetSuggestions, async () => {
    let result = null;
    const startTime = (0, (_performanceNow || _load_performanceNow()).default)();
    if (request.activatedManually) {
      try {
        result = await provider.getSuggestions(request);
      } catch (e) {
        (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventNames.errorOnGetSuggestions);
      }
    } else {
      try {
        result = await (0, (_promise || _load_promise()).timeoutPromise)(Promise.resolve(provider.getSuggestions(request)), AUTOCOMPLETE_TIMEOUT);
      } catch (e) {
        if (e instanceof (_promise || _load_promise()).TimedOutError) {
          (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventNames.timeoutOnGetSuggestions);
        } else {
          (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventNames.errorOnGetSuggestions);
        }
      }
    }
    logObject.isEmpty = result == null || result.length === 0;
    const endTime = (0, (_performanceNow || _load_performanceNow()).default)();
    if (result) {
      result.forEach(suggestion => durationBySuggestion.set(suggestion, endTime - startTime));
    }
    return result;
  }, logObject);
}

function getSuggestionDetailsOnSelect(provider, eventNames, suggestion) {
  const logObject = {};

  return (0, (_nuclideAnalytics || _load_nuclideAnalytics()).trackTiming)(eventNames.onGetSuggestionDetailsOnSelect, async () => {
    let result = null;
    if (provider.getSuggestionDetailsOnSelect != null) {
      try {
        result = await provider.getSuggestionDetailsOnSelect(suggestion);
      } catch (e) {
        (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventNames.errorOnGetSuggestionDetailsOnSelect);
      }
    }
    logObject.isEmpty = result == null;

    return result;
  }, logObject);
}

function onDidInsertSuggestion(provider, eventNames, insertedSuggestionArgument) {
  trackOnDidInsertSuggestion(eventNames.onDidInsertSuggestion, provider.analytics.shouldLogInsertedSuggestion, insertedSuggestionArgument);
  if (provider.onDidInsertSuggestion) {
    provider.onDidInsertSuggestion(insertedSuggestionArgument);
  }
}

function trackOnDidInsertSuggestion(eventName, shouldLogInsertedSuggestion, insertedSuggestionArgument) {
  const duration = durationBySuggestion.get(insertedSuggestionArgument.suggestion);
  if (!shouldLogInsertedSuggestion) {
    (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventName, {
      duration
    });
    return;
  }

  const { suggestion } = insertedSuggestionArgument;
  const suggestionText = suggestion.text != null ? suggestion.text : suggestion.snippet;
  (0, (_nuclideAnalytics || _load_nuclideAnalytics()).track)(eventName, {
    duration,
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
    timeoutOnGetSuggestions: eventNameFor('timeout-on-get-suggestions'),
    errorOnGetSuggestionDetailsOnSelect: eventNameFor('error-on-get-suggestion-details-on-select'),
    onGetSuggestionDetailsOnSelect: eventNameFor('on-get-suggestion-details-on-select')
  };
}