"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.watchFile = watchFile;
exports.watchWithNode = watchWithNode;
exports.watchDirectory = watchDirectory;
exports.watchDirectoryRecursive = watchDirectoryRecursive;

function _nuclideUri() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
    return data;
  };

  return data;
}

function _SharedObservableCache() {
  const data = _interopRequireDefault(require("../../commons-node/SharedObservableCache"));

  _SharedObservableCache = function () {
    return data;
  };

  return data;
}

var _fs = _interopRequireDefault(require("fs"));

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _fsPromise() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/fsPromise"));

  _fsPromise = function () {
    return data;
  };

  return data;
}

function _log4js() {
  const data = require("log4js");

  _log4js = function () {
    return data;
  };

  return data;
}

function _nuclideWatchmanHelpers() {
  const data = require("../../../modules/nuclide-watchman-helpers");

  _nuclideWatchmanHelpers = function () {
    return data;
  };

  return data;
}

function _debounceDeletes() {
  const data = _interopRequireDefault(require("./debounceDeletes"));

  _debounceDeletes = function () {
    return data;
  };

  return data;
}

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
// Cache an observable for each watched entity (file or directory).
// Multiple watches for the same entity can share the same observable.
const entityWatches = new (_SharedObservableCache().default)(registerWatch); // In addition, expose the observer behind each observable so we can
// dispatch events from the root subscription.

const entityObserver = new Map();
const watchedDirectories = new Set();
let watchmanClient = null;

function getWatchmanClient() {
  if (watchmanClient == null) {
    watchmanClient = new (_nuclideWatchmanHelpers().WatchmanClient)();
  }

  return watchmanClient;
}

function watchFile(filePath) {
  return watchEntity(filePath, true).publish();
}

function watchWithNode(watchedPath, isDirectory) {
  return _rxjsCompatUmdMin.Observable.create(observer => {
    const watcher = _fs.default.watch(watchedPath, {
      persistent: false
    }, // Note: Flow doesn't know this, but `fs.watch` may emit null filenames.
    (eventType, fileName) => {
      let path = watchedPath;

      if (isDirectory) {
        // Be defensive if we don't know what changed.
        if (fileName == null) {
          return;
        }

        path = _nuclideUri().default.join(watchedPath, fileName);
      }

      if (eventType === 'rename') {
        observer.next({
          path,
          type: 'delete'
        });
      } else {
        observer.next({
          path,
          type: 'change'
        });
      }
    });

    return () => watcher.close();
  }).publish();
}

function watchDirectory(directoryPath) {
  return watchEntity(directoryPath, false).publish();
}

function watchEntity(entityPath, isFile) {
  return _rxjsCompatUmdMin.Observable.fromPromise(getRealOrWatchablePath(entityPath, isFile)).switchMap(realPath => (0, _debounceDeletes().default)(entityWatches.get(realPath)));
} // Register an observable for the given path.


function registerWatch(path) {
  return _rxjsCompatUmdMin.Observable.create(observer => {
    entityObserver.set(path, observer);
    return () => {
      entityObserver.delete(path);
    };
  }).map(type => ({
    path,
    type
  })).share();
}

async function getRealOrWatchablePath(entityPath, isFile) {
  try {
    const stat = await _fsPromise().default.stat(entityPath);

    if (stat.isFile() !== isFile) {
      (0, _log4js().getLogger)('nuclide-filewatcher-rpc').warn(`FileWatcherService: expected ${entityPath} to be a ${isFile ? 'file' : 'directory'}`);
    }

    return await _fsPromise().default.realpath(entityPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      for (const dir of watchedDirectories) {
        if (entityPath.startsWith(_nuclideUri().default.ensureTrailingSeparator(dir))) {
          // We have at least one watched directory that will find this path,
          // continue with the watch assuming it's canonical
          return entityPath;
        }
      }
    }

    throw error;
  }
}

function watchDirectoryRecursive(directoryPath) {
  const client = getWatchmanClient();

  if (client.hasSubscription(directoryPath)) {
    return _rxjsCompatUmdMin.Observable.of('EXISTING').publish();
  }

  return _rxjsCompatUmdMin.Observable.fromPromise(client.watchDirectoryRecursive(directoryPath, `filewatcher-${directoryPath}`, // Reloading with file changes should happen
  // during source control operations to reflect the file contents / tree state.
  {
    defer_vcs: false
  })).flatMap(watcher => {
    // Listen for watcher changes to route them to watched files and directories.
    watcher.on('change', entries => {
      onWatcherChange(watcher, entries);
    });
    watchedDirectories.add(directoryPath);
    return _rxjsCompatUmdMin.Observable.create(observer => {
      // Notify success watcher setup.
      observer.next('SUCCESS');
      return () => unwatchDirectoryRecursive(directoryPath);
    });
  }).publish();
}

function onWatcherChange(subscription, entries) {
  const directoryChanges = new Set();
  entries.forEach(entry => {
    const entryPath = _nuclideUri().default.join(subscription.path, entry.name);

    const observer = entityObserver.get(entryPath);

    if (observer != null) {
      // TODO(most): handle `rename`, if needed.
      if (!entry.exists) {
        observer.next('delete');
      } else {
        observer.next('change');
      }
    } // A file watch event can also be considered a directory change
    // for the parent directory if a file was created or deleted.


    if (entry.new || !entry.exists) {
      directoryChanges.add(_nuclideUri().default.dirname(entryPath));
    }
  });
  directoryChanges.forEach(watchedDirectoryPath => {
    const observer = entityObserver.get(watchedDirectoryPath);

    if (observer != null) {
      observer.next('change');
    }
  });
}

async function unwatchDirectoryRecursive(directoryPath) {
  watchedDirectories.delete(directoryPath);
  await getWatchmanClient().unwatch(directoryPath);
}