"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RemoteDirectory = exports.EDEN_PERFORMANCE_SAMPLE_RATE = void 0;

function _memoize2() {
  const data = _interopRequireDefault(require("lodash/memoize"));

  _memoize2 = function () {
    return data;
  };

  return data;
}

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
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

function _eventKit() {
  const data = require("event-kit");

  _eventKit = function () {
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

function _nuclideAnalytics() {
  const data = require("../../../modules/nuclide-analytics");

  _nuclideAnalytics = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const logger = (0, _log4js().getLogger)('nuclide-remote-connection');
const MARKER_PROPERTY_FOR_REMOTE_DIRECTORY = '__nuclide_remote_directory__';
const EDEN_PERFORMANCE_SAMPLE_RATE = 10;
/**
 * This is a global function because RemoteDirectory's are not re-used. Cached
 * results must be global since they cannot be attached to an instance.
 */

exports.EDEN_PERFORMANCE_SAMPLE_RATE = EDEN_PERFORMANCE_SAMPLE_RATE;

const _isEden = (0, _memoize2().default)(async (uri, fileSystemService) => {
  if (_nuclideUri().default.endsWithEdenDir(uri)) {
    // this is needed to avoid checking for .eden/.eden/root, which results in
    // ELOOP: too many symbolic links encountered
    return true;
  }

  const edenDir = _nuclideUri().default.join(uri, '.eden/root');

  return fileSystemService.exists(edenDir);
});
/* Mostly implements https://atom.io/docs/api/latest/Directory */


class RemoteDirectory {
  static isRemoteDirectory(directory) {
    /* $FlowFixMe */
    return directory[MARKER_PROPERTY_FOR_REMOTE_DIRECTORY] === true;
  }

  /**
   * @param uri should be of the form "nuclide://example.com/path/to/directory".
   */
  constructor(server, uri, symlink = false, options) {
    Object.defineProperty(this, MARKER_PROPERTY_FOR_REMOTE_DIRECTORY, {
      value: true
    });
    this._server = server;
    this._uri = uri;
    this._emitter = new (_eventKit().Emitter)();
    this._subscriptionCount = 0;
    this._symlink = symlink;

    const {
      path: directoryPath,
      hostname
    } = _nuclideUri().default.parse(uri);

    if (!(hostname != null)) {
      throw new Error("Invariant violation: \"hostname != null\"");
    }
    /** In the example, this would be "nuclide://example.com". */


    this._host = hostname;
    /** In the example, this would be "/path/to/directory". */

    this._localPath = directoryPath; // A workaround before Atom 2.0: see ::getHgRepoInfo of main.js.

    this._hgRepositoryDescription = options ? options.hgRepositoryDescription : null;
    this._isArchive = options != null && Boolean(options.isArchive);
    this._deleted = false;
  }

  dispose() {
    this._subscriptionCount = 0;

    this._unsubscribeFromNativeChangeEvents();
  }

  onDidChange(callback) {
    this._willAddSubscription();

    return this._trackUnsubscription(this._emitter.on('did-change', callback));
  }

  onDidDelete(callback) {
    this._willAddSubscription();

    return this._trackUnsubscription(this._emitter.on('did-delete', callback));
  }
  /**
   * We may want to provide an implementation for this at some point.
   * However, for the time being, we don't get any benefits from doing so.
   */


  onDidChangeFiles(callback) {
    return new (_UniversalDisposable().default)();
  }

  _willAddSubscription() {
    this._subscriptionCount++;

    try {
      this._subscribeToNativeChangeEvents();
    } catch (err) {
      logger.error('Failed to subscribe RemoteDirectory:', this._localPath, err);
    }
  }

  _subscribeToNativeChangeEvents() {
    if (this._watchSubscription) {
      return;
    }

    const watchStream = _nuclideUri().default.isInArchive(this._uri) ? this._server.getFileWatch(_nuclideUri().default.ancestorOutsideArchive(this._uri)) : this._server.getDirectoryWatch(this._uri);
    this._watchSubscription = watchStream.subscribe(watchUpdate => {
      logger.debug('watchDirectory update:', watchUpdate);

      switch (watchUpdate.type) {
        case 'change':
          return this._handleNativeChangeEvent();

        case 'delete':
          return this._handleNativeDeleteEvent();
      }
    }, error => {
      logger.error('Failed to subscribe RemoteDirectory:', this._uri, error);
      this._watchSubscription = null;
    }, () => {
      // Nothing needs to be done if the root directory watch has ended.
      logger.debug(`watchDirectory ended: ${this._uri}`);
      this._watchSubscription = null;
    });
  }

  _handleNativeChangeEvent() {
    this._emitter.emit('did-change');
  }

  _handleNativeDeleteEvent() {
    this._unsubscribeFromNativeChangeEvents();

    if (!this._deleted) {
      this._deleted = true;

      this._emitter.emit('did-delete');
    }
  }

  _trackUnsubscription(subscription) {
    return new (_UniversalDisposable().default)(() => {
      subscription.dispose();

      this._didRemoveSubscription();
    });
  }

  _didRemoveSubscription() {
    this._subscriptionCount--;

    if (this._subscriptionCount === 0) {
      return this._unsubscribeFromNativeChangeEvents();
    }
  }

  _unsubscribeFromNativeChangeEvents() {
    if (this._watchSubscription) {
      try {
        this._watchSubscription.unsubscribe();
      } catch (error) {
        logger.warn('RemoteDirectory failed to unsubscribe from native events:', this._uri, error.message);
      }

      this._watchSubscription = null;
    }
  }

  _joinLocalPath(name) {
    return this._isArchive ? _nuclideUri().default.archiveJoin(this._localPath, name) : _nuclideUri().default.join(this._localPath, name);
  }

  isFile() {
    return false;
  }

  isDirectory() {
    return true;
  }

  isRoot() {
    return this._isRoot(this._localPath);
  }

  exists() {
    return this._getFileSystemService().exists(this._uri);
  }

  existsSync() {
    // As of Atom 1.12, `atom.project.addPath` checks for project existence.
    // We must return true to have our remote directories be addable.
    return true;
  }

  _isRoot(filePath_) {
    let filePath = filePath_;
    filePath = _nuclideUri().default.normalize(filePath);

    const parts = _nuclideUri().default.parsePath(filePath);

    return parts.root === filePath;
  }

  getPath() {
    return this._uri;
  }

  getLocalPath() {
    return this._localPath;
  }

  getRealPathSync() {
    // Remote paths should already be resolved.
    return this._uri;
  }

  getBaseName() {
    return _nuclideUri().default.basename(this._localPath);
  }

  relativize(uri) {
    if (!_nuclideUri().default.isRemote(uri || '')) {
      return uri;
    }

    const parsedUrl = _nuclideUri().default.parse(uri);

    if (parsedUrl.hostname !== this._host) {
      return uri;
    }

    return _nuclideUri().default.relative(this._localPath, parsedUrl.path);
  }

  getParent() {
    if (this.isRoot()) {
      return this;
    } else {
      const uri = _nuclideUri().default.createRemoteUri(this._host, _nuclideUri().default.dirname(this._localPath));

      return this._server.createDirectory(uri, this._hgRepositoryDescription);
    }
  }

  getFile(filename) {
    const uri = _nuclideUri().default.createRemoteUri(this._host, this._joinLocalPath(filename));

    return this._server.createFile(uri);
  }

  getSubdirectory(dir) {
    const uri = _nuclideUri().default.createRemoteUri(this._host, this._joinLocalPath(dir));

    return this._server.createDirectory(uri, this._hgRepositoryDescription);
  }

  async create() {
    if (!!this._deleted) {
      throw new Error('RemoteDirectory has been deleted');
    }

    const created = await this._getFileSystemService().mkdirp(this._uri);

    if (this._subscriptionCount > 0) {
      this._subscribeToNativeChangeEvents();
    }

    return created;
  }

  async delete() {
    await this._getFileSystemService().rmdir(this._uri);

    this._handleNativeDeleteEvent();
  }

  getEntriesSync() {
    throw new Error('not implemented');
  }
  /*
   * Calls `callback` with either an Array of entries or an Error if there was a problem fetching
   * those entries.
   *
   * Note: Although this function is `async`, it never rejects. Check whether the `error` argument
   * passed to `callback` is `null` to determine if there was an error.
   */


  async getEntries(callback) {
    let entries = [];
    const readDirError = await (0, _nuclideAnalytics().trackTimingSampled)('eden-filesystem-metrics:readdirSorted', async () => {
      try {
        entries = await this._getFileSystemService().readdirSorted(this._uri);
        return false;
      } catch (e) {
        callback(e, null);
        return true;
      }
    }, EDEN_PERFORMANCE_SAMPLE_RATE, {
      isEden: await _isEden(this._uri, this._getFileSystemService()),
      uri: this._uri
    });

    if (readDirError) {
      return;
    }

    const directories = [];
    const files = [];
    entries.forEach(entry => {
      const [name, isFile, isSymlink] = entry;

      const uri = _nuclideUri().default.createRemoteUri(this._host, this._joinLocalPath(name));

      if (isFile) {
        files.push(this._server.createFile(uri, isSymlink));
      } else {
        directories.push(this._server.createDirectory(uri, this._hgRepositoryDescription, isSymlink));
      }
    });
    callback(null, directories.concat(files));
  }

  contains(pathToCheck) {
    if (!_nuclideUri().default.isRemote(pathToCheck || '')) {
      return false;
    }

    return _nuclideUri().default.contains(this.getPath(), pathToCheck || '');
  }

  off() {} // This method is part of the EmitterMixin used by Atom's local Directory, but not documented
  // as part of the API - https://atom.io/docs/api/latest/Directory,
  // However, it appears to be called in project.coffee by Atom.
  // A workaround before Atom 2.0: see ::getHgRepoInfo of main.js.


  getHgRepositoryDescription() {
    return this._hgRepositoryDescription;
  }

  isSymbolicLink() {
    return this._symlink;
  }

  _getFileSystemService() {
    return this._getService('FileSystemService');
  }

  _getService(serviceName) {
    return this._server.getService(serviceName);
  }

}

exports.RemoteDirectory = RemoteDirectory;