"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _nuclideRemoteConnection() {
  const data = require("../../nuclide-remote-connection");

  _nuclideRemoteConnection = function () {
    return data;
  };

  return data;
}

function _constants() {
  const data = require("../../nuclide-working-sets-common/lib/constants");

  _constants = function () {
    return data;
  };

  return data;
}

function _constants2() {
  const data = require("./constants");

  _constants2 = function () {
    return data;
  };

  return data;
}

function _collection() {
  const data = require("../../../modules/nuclide-commons/collection");

  _collection = function () {
    return data;
  };

  return data;
}

function _nuclideUri() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
    return data;
  };

  return data;
}

function _featureConfig() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons-atom/feature-config"));

  _featureConfig = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
class RemoteDirectorySearcher {
  // When constructed, RemoteDirectorySearcher must be passed a function that
  // it can use to get a 'CodeSearchService' for a given remote path.
  constructor(serviceProvider, getWorkingSetsStore) {
    this._serviceProvider = serviceProvider;
    this._getWorkingSetsStore = getWorkingSetsStore;
  }

  canSearchDirectory(directory) {
    return _nuclideRemoteConnection().RemoteDirectory.isRemoteDirectory(directory);
  }

  search(directories, regex, options) {
    const config = _featureConfig().default.get('nuclide-code-search'); // Track the files that we have seen updates for.


    const seenFiles = new Set(); // Get the remote service that corresponds to each remote directory.

    const services = directories.map(dir => this._serviceProvider(dir));
    const includePaths = directories.map(dir => this.processPaths(dir.getPath(), options.inclusions));
    const searchStreams = includePaths.map((inclusion, index) => // processPaths returns null if the inclusions are too strict for the
    // given directory, so we don't even want to start the search. This can
    // happen if we're searching in a working set that excludes the directory.
    inclusion ? services[index].remoteAtomSearch(directories[index].getPath(), regex, inclusion, config.remoteUseVcsSearch, config.remoteTool.length === 0 ? null : config.remoteTool, options.leadingContextLineCount, options.trailingContextLineCount).refCount() : _rxjsCompatUmdMin.Observable.empty()); // Start the search in each directory, and merge the resulting streams.

    const searchStream = _rxjsCompatUmdMin.Observable.merge(...searchStreams); // Create a subject that we can use to track search completion.


    const searchCompletion = new _rxjsCompatUmdMin.ReplaySubject();
    searchCompletion.next();
    const subscription = searchStream.subscribe(next => {
      options.didMatch(next); // Call didSearchPaths with the number of unique files we have seen matches in. This is
      // not technically correct, as didSearchPaths is also supposed to count files for which
      // no matches were found. However, we currently have no way of obtaining this information.

      seenFiles.add(next.filePath);
      options.didSearchPaths(seenFiles.size);
    }, error => {
      options.didError(error);
      searchCompletion.error(error);
    }, () => {
      searchCompletion.complete();
    }); // Return a promise that resolves on search completion.

    const completionPromise = searchCompletion.toPromise();
    return {
      then: completionPromise.then.bind(completionPromise),

      cancel() {
        // Cancel the subscription, which should also kill the grep process.
        subscription.unsubscribe();
      }

    };
  }
  /**
   * If a query's prefix matches the rootPath's basename, treat the query as a relative search.
   * Based on https://github.com/atom/atom/blob/master/src/scan-handler.coffee.
   * Returns null if we shouldn't search rootPath.
   */


  processPaths(rootPath, paths) {
    if (paths == null) {
      return [];
    }

    const rootPathBase = _nuclideUri().default.basename(rootPath);

    const results = [];

    for (const path of paths) {
      if (path === _constants().WORKING_SET_PATH_MARKER) {
        const workingSetsStore = this._getWorkingSetsStore();

        if (!workingSetsStore) {
          _constants2().logger.error('workingSetsStore not found but trying to search in working sets');

          continue;
        }

        const workingSetUris = (0, _collection().arrayFlatten)(workingSetsStore.getApplicableDefinitions().filter(def => def.active).map(def => def.uris)) // A working set can contain paths outside of rootPath. Ignore these.
        .filter(uri => _nuclideUri().default.contains(rootPath, uri)) // `processPaths` expects the second argument to be a relative path
        // instead of the fully qualified NuclideUris we have here.
        .map(uri => _nuclideUri().default.relative(rootPath, uri));

        if (workingSetUris.length === 0) {
          // Working set and rootPath are disjoint, we shouldn't search rootPath
          return null;
        }

        if (!!workingSetUris.includes(_constants().WORKING_SET_PATH_MARKER)) {
          throw new Error("Invariant violation: \"!workingSetUris.includes(WORKING_SET_PATH_MARKER)\"");
        }

        const processed = this.processPaths(rootPath, workingSetUris);

        if (!processed) {
          throw new Error("Invariant violation: \"processed\"");
        }

        results.push(...processed);
        continue;
      }

      const segments = _nuclideUri().default.split(path);

      const firstSegment = segments.shift();
      results.push(path);

      if (firstSegment === rootPathBase) {
        if (segments.length === 0) {
          // Search everything.
          return [];
        } else {
          // Try interpreting this as a subdirectory of the base as well.
          results.push(_nuclideUri().default.join(...segments));
        }
      }
    }

    return results;
  }

}

exports.default = RemoteDirectorySearcher;