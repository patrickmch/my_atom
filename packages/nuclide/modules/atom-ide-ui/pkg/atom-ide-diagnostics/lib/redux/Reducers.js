"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.messages = messages;
exports.codeActionFetcher = codeActionFetcher;
exports.codeActionsForMessage = codeActionsForMessage;
exports.descriptions = descriptions;
exports.providers = providers;
exports.lastUpdateSource = lastUpdateSource;

function Actions() {
  const data = _interopRequireWildcard(require("./Actions"));

  Actions = function () {
    return data;
  };

  return data;
}

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
const MAX_MESSAGE_COUNT_PER_PROVIDER_PER_FILE = 1000;

function messages(state = new Map(), action) {
  switch (action.type) {
    case Actions().UPDATE_MESSAGES:
      {
        const {
          provider,
          update
        } = action.payload;
        const nextState = new Map(state); // Override the messages we already have for each path.

        const prevMessages = nextState.get(provider) || new Map(); // This O(nlogn) copying + sorting is potentially expensive. However,
        // we'd like to keep this immutable and we're also accumulating the messages, (and therefore
        // already O(n^2)). So, for now, we'll accept that and revisit if it proves to be a
        // bottleneck.

        const nextMessages = new Map([...prevMessages, ...sortUpdateMessages(update)]);
        nextState.set(provider, nextMessages);
        return nextState;
      }

    case Actions().INVALIDATE_MESSAGES:
      {
        const {
          provider,
          invalidation
        } = action.payload; // If there aren't any messages for this provider, there's nothing to do.

        const filesToMessages = state.get(provider);

        if (filesToMessages == null || filesToMessages.size === 0) {
          return state;
        }

        switch (invalidation.scope) {
          case 'all':
            {
              // Clear the messages for this provider.
              const nextState = new Map(state);
              nextState.set(provider, new Map());
              return nextState;
            }

          case 'file':
            {
              let nextMessages;

              for (const filePath of invalidation.filePaths) {
                // If we have messages for this path, clear them. We take care not to update the state
                // if we don't have any messages for the paths.
                const messagesForFile = filesToMessages.get(filePath);

                if (messagesForFile != null && messagesForFile.length > 0) {
                  nextMessages = nextMessages || new Map(filesToMessages);
                  nextMessages.delete(filePath);
                }
              } // If we didn't update the messages, we don't need to update the state.


              if (nextMessages == null) {
                return state;
              }

              const nextState = new Map(state);
              nextState.set(provider, nextMessages);
              return nextState;
            }

          default:
            invalidation.scope;
            throw new Error(`Invalid scope: ${invalidation.scope}`);
        }
      }

    case Actions().FIXES_APPLIED:
      {
        const {
          messages: messagesToRemove,
          filePath
        } = action.payload; // $FlowFixMe(>=0.68.0) Flow suppress (T27187857)

        if (messagesToRemove.length === 0) {
          return state;
        } // When a fix is applied, immediately remove that message from the state.


        let nextState;

        for (const [provider, pathsToMessages] of state) {
          const providerMessages = pathsToMessages.get(filePath); // $FlowFixMe(>=0.68.0) Flow suppress (T27187857)

          if (providerMessages == null || providerMessages.size === 0) {
            // There aren't any messages for this provider, so we don't have to remove anything.
            continue;
          }

          const filtered = providerMessages.filter(message => !messagesToRemove.has(message));

          if (filtered.length === providerMessages.length) {
            // We didn't actually remove anything.
            continue;
          }

          if (nextState == null) {
            nextState = new Map(state);
          }

          const nextPathsToMessages = new Map(pathsToMessages);
          nextPathsToMessages.set(filePath, filtered);
          nextState.set(provider, nextPathsToMessages);
        }

        return nextState || state;
      }

    case Actions().REMOVE_PROVIDER:
      {
        return mapDelete(state, action.payload.provider);
      }

    case Actions().MARK_MESSAGES_STALE:
      {
        const {
          filePath
        } = action.payload;
        return markStaleMessages(state, filePath);
      }
  }

  return state;
}

function codeActionFetcher(state = null, action) {
  if (action.type === Actions().SET_CODE_ACTION_FETCHER) {
    return action.payload.codeActionFetcher;
  }

  return state;
}

function codeActionsForMessage(state = new Map(), action) {
  if (action.type === Actions().SET_CODE_ACTIONS) {
    state.forEach(codeActions => {
      codeActions.forEach(codeAction => codeAction.dispose());
    });
    return action.payload.codeActionsForMessage;
  }

  return state;
}

function descriptions(state = new Map(), action) {
  if (action.type === Actions().SET_DESCRIPTIONS) {
    if (!action.payload.keepDescriptions) {
      return action.payload.descriptions;
    }

    return new Map([...state, ...action.payload.descriptions]);
  }

  return state;
}

function providers(state = new Set(), action) {
  switch (action.type) {
    case Actions().ADD_PROVIDER:
      {
        const nextState = new Set(state);
        nextState.add(action.payload.provider);
        return nextState;
      }

    case Actions().REMOVE_PROVIDER:
      {
        const nextState = new Set(state);
        nextState.delete(action.payload.provider);
        return nextState;
      }
  }

  return state;
}

function lastUpdateSource(state = 'Provider', action) {
  switch (action.type) {
    case Actions().UPDATE_MESSAGES:
      {
        return 'Provider';
      }

    case Actions().MARK_MESSAGES_STALE:
      {
        return 'Stale';
      }
  }

  return state;
}
/**
 * Delete a key from a map, treating is as an immutable collection. If the key isn't present, the
 * same map will be returned. Otherwise, a copy will be made missing the key.
 */


function mapDelete(map, key) {
  if (map.has(key)) {
    const copy = new Map(map);
    copy.delete(key);
    return copy;
  }

  return map;
}
/**
 * Mark all messages on the provided filepath stale
 */


function markStaleMessages(state, filePath) {
  const nextState = new Map(state);
  nextState.forEach((fileToMessages, provider) => {
    const newFileToMessages = new Map(fileToMessages);
    const messagesOnCurrentFile = newFileToMessages.get(filePath);

    if (messagesOnCurrentFile) {
      const staleMessagesOnCurrentFile = messagesOnCurrentFile.map(msg => {
        // Mark message stale
        return Object.assign({}, msg, {
          stale: true
        });
      });
      newFileToMessages.set(filePath, staleMessagesOnCurrentFile);
    }

    nextState.set(provider, newFileToMessages);
  });
  return nextState;
}

function sortUpdateMessages(update) {
  const newUpdate = new Map();

  for (const [filePath, updateMessages] of update) {
    newUpdate.set(filePath, updateMessages.slice(0, MAX_MESSAGE_COUNT_PER_PROVIDER_PER_FILE).sort((a, b) => {
      const aRange = a.range;

      if (aRange == null) {
        return -1;
      }

      const bRange = b.range;

      if (bRange == null) {
        return 1;
      }

      return aRange.compare(bRange);
    }));
  }

  return newUpdate;
}