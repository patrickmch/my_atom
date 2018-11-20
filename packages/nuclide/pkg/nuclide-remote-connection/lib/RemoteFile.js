"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RemoteFile = void 0;

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
    return data;
  };

  return data;
}

function _loadingNotification() {
  const data = _interopRequireDefault(require("../../commons-atom/loading-notification"));

  _loadingNotification = function () {
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

var _crypto = _interopRequireDefault(require("crypto"));

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

var _stream = _interopRequireDefault(require("stream"));

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
const logger = (0, _log4js().getLogger)('nuclide-remote-connection'); // Warn if a file takes too long to save.

const LONG_FILE_WRITE_MS = 10000;
/* Mostly implements https://atom.io/docs/api/latest/File */

class RemoteFile {
  constructor(server, remotePath, symlink = false) {
    this._server = server;
    this.setPath(remotePath);
    this._emitter = new (_eventKit().Emitter)();
    this._subscriptionCount = 0;
    this._deleted = false;
    this._symlink = symlink;
  }

  dispose() {
    this._subscriptionCount = 0;

    this._unsubscribeFromNativeChangeEvents();
  }

  onDidChange(callback) {
    this._willAddSubscription();

    return this._trackUnsubscription(this._emitter.on('did-change', callback));
  }

  onDidRename(callback) {
    // TODO: this is not supported by the Watchman API.
    return new (_UniversalDisposable().default)();
  }

  onDidDelete(callback) {
    this._willAddSubscription();

    return this._trackUnsubscription(this._emitter.on('did-delete', callback));
  }

  _willAddSubscription() {
    this._subscriptionCount++;

    this._subscribeToNativeChangeEvents();
  }

  _subscribeToNativeChangeEvents() {
    if (this._watchSubscription) {
      return;
    }

    const watchStream = this._server.getFileWatch(this._path);

    this._watchSubscription = watchStream.subscribe(watchUpdate => {
      // This only happens after a `setPath` and subsequent file rename.
      // Getting this message signifies that the new file should be ready for watching.
      if (watchUpdate.path !== this._path) {
        logger.debug('watchFile renamed:', this._path);

        this._unsubscribeFromNativeChangeEvents();

        this._subscribeToNativeChangeEvents();

        return;
      }

      logger.debug('watchFile update:', watchUpdate);

      switch (watchUpdate.type) {
        case 'change':
          return this._handleNativeChangeEvent();

        case 'delete':
          return this._handleNativeDeleteEvent();
      }
    }, error => {
      // In the case of new files, it's normal for the remote file to not exist yet.
      if (error.code !== 'ENOENT') {
        logger.error('Failed to subscribe RemoteFile:', this._path, error);
      }

      this._watchSubscription = null;
    }, () => {
      // Nothing needs to be done if the root directory watch has ended.
      logger.debug(`watchFile ended: ${this._path}`);
      this._watchSubscription = null;
    });
  }

  _handleNativeChangeEvent() {
    // Don't bother checking the file - this can be very expensive.
    this._emitter.emit('did-change');

    return Promise.resolve();
  }

  _handleNativeDeleteEvent() {
    this._unsubscribeFromNativeChangeEvents();

    if (!this._deleted) {
      this._deleted = true;

      this._emitter.emit('did-delete');
    }
  }
  /*
   * Return a new Disposable that upon dispose, will remove the bound watch subscription.
   * When the number of subscriptions reach 0, the file is unwatched.
   */


  _trackUnsubscription(subscription) {
    return new (_UniversalDisposable().default)(() => {
      subscription.dispose();

      this._didRemoveSubscription();
    });
  }

  _didRemoveSubscription() {
    this._subscriptionCount--;

    if (this._subscriptionCount === 0) {
      this._unsubscribeFromNativeChangeEvents();
    }
  }

  _unsubscribeFromNativeChangeEvents() {
    if (this._watchSubscription) {
      this._watchSubscription.unsubscribe();

      this._watchSubscription = null;
    }
  }

  onWillThrowWatchError(callback) {
    return this._emitter.on('will-throw-watch-error', callback);
  }

  isFile() {
    return true;
  }

  isDirectory() {
    return false;
  }

  exists() {
    return this._getFileSystemService().exists(this._path);
  }

  existsSync() {
    return true;
  }

  getDigestSync() {
    // flowlint-next-line sketchy-null-string:off
    if (!this._digest) {
      // File's `getDigestSync()` calls `readSync()`, which we don't implement.
      // However, we mimic it's behavior for when a file does not exist.
      this._setDigest('');
    } // flowlint-next-line sketchy-null-string:off


    if (!this._digest) {
      throw new Error("Invariant violation: \"this._digest\"");
    }

    return this._digest;
  }

  async getDigest() {
    // flowlint-next-line sketchy-null-string:off
    if (this._digest) {
      return this._digest;
    }

    await this.read(); // flowlint-next-line sketchy-null-string:off

    if (!this._digest) {
      throw new Error("Invariant violation: \"this._digest\"");
    }

    return this._digest;
  }

  _setDigest(contents) {
    const hash = _crypto.default.createHash('sha1').update(contents || '');

    if (!hash) {
      throw new Error("Invariant violation: \"hash\"");
    }

    this._digest = hash.digest('hex');
  }

  setEncoding(encoding) {
    this._encoding = encoding;
  }

  getEncoding() {
    return this._encoding;
  }

  setPath(remotePath) {
    const {
      path: localPath
    } = _nuclideUri().default.parse(remotePath);

    this._localPath = localPath;
    this._path = remotePath;
  }

  getPath() {
    return this._path;
  }

  getLocalPath() {
    return this._localPath;
  }

  getRealPathSync() {
    // flowlint-next-line sketchy-null-string:off
    return this._realpath || this._path;
  }

  async getRealPath() {
    if (this._realpath == null) {
      this._realpath = await this._getFileSystemService().realpath(this._path);
    }

    if (!this._realpath) {
      throw new Error("Invariant violation: \"this._realpath\"");
    }

    return this._realpath;
  }

  getBaseName() {
    return _nuclideUri().default.basename(this._path);
  }

  async create() {
    const wasCreated = await this._getFileSystemService().newFile(this._path);

    if (this._subscriptionCount > 0) {
      this._subscribeToNativeChangeEvents();
    }

    return wasCreated;
  }

  async delete() {
    try {
      await this._getFileSystemService().unlink(this._path);

      this._handleNativeDeleteEvent();
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async copy(newPath) {
    const wasCopied = await this._getFileSystemService().copy(this._path, newPath);

    this._subscribeToNativeChangeEvents();

    return wasCopied;
  }

  async read(flushCache) {
    const data = await this._getFileSystemService().readFile(this._path);
    const contents = data.toString();

    this._setDigest(contents); // TODO: respect encoding


    return contents;
  }

  readSync(flushcache) {
    throw new Error('readSync is not supported in RemoteFile');
  }

  async write(text) {
    const previouslyExisted = await this.exists();
    await this._getFileSystemService().writeFile(this._path, text);

    if (!previouslyExisted && this._subscriptionCount > 0) {
      this._subscribeToNativeChangeEvents();
    }
  }

  async writeWithPermission(text, permission) {
    const previouslyExisted = await this.exists();
    await this._getFileSystemService().writeFile(this._path, text, {
      mode: permission
    });

    if (!previouslyExisted && this._subscriptionCount > 0) {
      this._subscribeToNativeChangeEvents();
    }
  }

  getParent() {
    const directoryPath = _nuclideUri().default.dirname(this._path);

    const remoteConnection = this._server.getRemoteConnectionForUri(this._path);

    const hgRepositoryDescription = remoteConnection != null ? remoteConnection.getHgRepositoryDescription() : null;
    return this._server.createDirectory(directoryPath, hgRepositoryDescription);
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
  /**
   * Implementing a real stream (with chunks) is potentially very inefficient, as making
   * multiple RPC calls can take much longer than just fetching the entire file.
   * This stream just fetches the entire file contents for now.
   */


  createReadStream() {
    const path = this._path;

    const service = this._getFileSystemService(); // push() triggers another read(), so make sure we don't read the file twice.


    let pushed = false;
    const stream = new _stream.default.Readable({
      read(size) {
        if (pushed) {
          return;
        }

        service.readFile(path).then(buffer => {
          pushed = true;
          stream.push(buffer);
          stream.push(null);
        }, err => {
          stream.emit('error', err);
        });
      }

    });
    return stream;
  }
  /**
   * As with createReadStream, it's potentially very inefficient to write remotely in multiple
   * chunks. This stream just accumulates the data locally and flushes it all at once.
   */


  createWriteStream() {
    const writeData = [];
    let writeLength = 0;
    const stream = new _stream.default.Writable({
      write(chunk, encoding, next) {
        // `chunk` may be mutated by the caller, so make sure it's copied.
        writeData.push(Buffer.from(chunk));
        writeLength += chunk.length;
        next();
      },

      final: callback => {
        (0, _loadingNotification().default)(this._getFileSystemService().writeFileBuffer(this._path, Buffer.concat(writeData, writeLength)), `File ${_nuclideUri().default.nuclideUriToDisplayString(this._path)} ` + 'is taking an unexpectedly long time to save, please be patient...', LONG_FILE_WRITE_MS).then(callback, callback);
      }
    });
    return stream;
  }

}

exports.RemoteFile = RemoteFile;