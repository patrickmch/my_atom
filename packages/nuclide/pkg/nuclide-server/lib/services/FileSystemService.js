"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exists = exists;
exports.findNearestAncestorNamed = findNearestAncestorNamed;
exports.findFilesInDirectories = findFilesInDirectories;
exports.lstat = lstat;
exports.mkdir = mkdir;
exports.mkdirp = mkdirp;
exports.chmod = chmod;
exports.newFile = newFile;
exports.readdir = readdir;
exports.readdirSorted = readdirSorted;
exports.readdirRecursive = readdirRecursive;
exports.realpath = realpath;
exports.resolveRealPath = resolveRealPath;
exports.expandHomeDir = expandHomeDir;
exports.rename = rename;
exports.move = move;
exports.copy = copy;
exports.copyDir = copyDir;
exports.symlink = symlink;
exports.rmdir = rmdir;
exports.rmdirAll = rmdirAll;
exports.stat = stat;
exports.unlink = unlink;
exports.readFile = readFile;
exports.createReadStream = createReadStream;
exports.isNfs = isNfs;
exports.isFuse = isFuse;
exports.writeFile = writeFile;
exports.writeFileBuffer = writeFileBuffer;
exports.getFreeSpace = getFreeSpace;
exports.tempdir = tempdir;
exports.getNuclideDir = getNuclideDir;
exports.getNuclideLogDir = getNuclideLogDir;
exports.guessRealPath = guessRealPath;

var _fs = _interopRequireDefault(require("fs"));

function _fsPromise() {
  const data = _interopRequireDefault(require("../../../../modules/nuclide-commons/fsPromise"));

  _fsPromise = function () {
    return data;
  };

  return data;
}

function _nuclideUri() {
  const data = _interopRequireDefault(require("../../../../modules/nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
    return data;
  };

  return data;
}

function _process() {
  const data = require("../../../../modules/nuclide-commons/process");

  _process = function () {
    return data;
  };

  return data;
}

function _stream() {
  const data = require("../../../../modules/nuclide-commons/stream");

  _stream = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _systemInfo() {
  const data = require("../../../../modules/nuclide-commons/system-info");

  _systemInfo = function () {
    return data;
  };

  return data;
}

function _nuclideFs() {
  const data = require("../../../nuclide-fs");

  _nuclideFs = function () {
    return data;
  };

  return data;
}

function _nuclideLogging() {
  const data = require("../../../nuclide-logging");

  _nuclideLogging = function () {
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

/**
 * This code implements the NuclideFs service.  It exports the FS on http via
 * the endpoint: http://your.server:your_port/fs/method where method is one of
 * readFile, writeFile, etc.
 */
//------------------------------------------------------------------------------
// Services
//------------------------------------------------------------------------------

/**
 * Checks a certain path for existence and returns 'true'/'false' accordingly
 */
function exists(path) {
  return _nuclideFs().ROOT_FS.exists(path);
}
/**
 * Starting in the directory `pathToDirectory`, checks if it contains a file named `fileName`.
 * If so, it returns the path to the file. If not, it successively looks for `fileName` in the
 * parent directory. If it gets all the way to the root and still does not find the file, then it
 * returns `null`.
 */


async function findNearestAncestorNamed(fileName, pathToDirectory) {
  const directory = await _nuclideFs().ROOT_FS.findNearestFile(fileName, pathToDirectory);

  if (directory != null) {
    return _nuclideUri().default.join(directory, fileName);
  } else {
    return null;
  }
}

function findFilesInDirectories(searchPaths, fileName) {
  if (searchPaths.length === 0) {
    return _rxjsCompatUmdMin.Observable.throw(new Error('No directories to search in!')).publish();
  }

  const findArgs = [...searchPaths, '-type', 'f', '-name', fileName];
  return (0, _process().runCommand)('find', findArgs).map(stdout => stdout.split('\n').filter(filePath => filePath !== '')).publish();
}
/**
 * The lstat endpoint is the same as the stat endpoint except it will return
 * the stat of a link instead of the file the link points to.
 */


function lstat(path) {
  return _nuclideFs().ROOT_FS.lstat(path);
}
/**
 * Creates a new directory with the given path.
 * Throws EEXIST error if the directory already exists.
 * Throws ENOENT if the path given is nested in a non-existing directory.
 */


function mkdir(path) {
  return _nuclideFs().ROOT_FS.mkdir(path);
}
/**
 * Runs the equivalent of `mkdir -p` with the given path.
 *
 * Like most implementations of mkdirp, if it fails, it is possible that
 * directories were created for some prefix of the given path.
 * @return true if the path was created; false if it already existed.
 */


function mkdirp(path) {
  return _nuclideFs().ROOT_FS.mkdirp(path);
}
/**
 * Changes permissions on a file.
 */


function chmod(path, mode) {
  return _nuclideFs().ROOT_FS.chmod(path, mode);
}
/**
 * If no file (or directory) at the specified path exists, creates the parent
 * directories (if necessary) and then writes an empty file at the specified
 * path.
 *
 * @return A boolean indicating whether the file was created.
 */


async function newFile(filePath) {
  const isExistingFile = await _nuclideFs().ROOT_FS.exists(filePath);

  if (isExistingFile) {
    return false;
  }

  await _nuclideFs().ROOT_FS.mkdirp(_nuclideUri().default.dirname(filePath));
  await writeFile(filePath, '');
  return true;
}
/**
 * Lists all children of the given directory.
 */


async function readdir(path) {
  return _nuclideFs().ROOT_FS.readdir(path);
}
/**
 * Sorts the result of readdir() by alphabetical order (case-insensitive).
 */


async function readdirSorted(path) {
  return (await _nuclideFs().ROOT_FS.readdir(path)).sort((a, b) => {
    return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
  });
}
/**
 * Recursively lists all children of the given directory. The limit param
 * puts a bound on the maximum number of entries that can be returned.
 * TODO: Consider adding concurrency while traversing search directories.
 */


async function readdirRecursive(root, limit = 100) {
  // Keep a running array of all files and directories we encounter.
  const result = [];

  const helper = async path => {
    const entries = await _nuclideFs().ROOT_FS.readdir(_nuclideUri().default.join(root, path)); // We have to sort the entries to ensure that the limit is applied
    // consistently.

    entries.sort((a, b) => a[0].localeCompare(b[0]));

    for (const entry of entries) {
      // Prevent the results array from going over the limit.
      if (result.length >= limit) {
        break;
      }

      const [name, isFile, isSymbolicLink] = entry; // Path to this entry from root.

      const entryPath = _nuclideUri().default.join(path, name);

      result.push([entryPath, isFile, isSymbolicLink]); // Recurse on directory if we aren't at the limit.

      if (!isFile && result.length < limit) {
        // eslint-disable-next-line no-await-in-loop
        await helper(entryPath);
      }
    }
  };

  await helper('.');
  return result;
}
/**
 * Gets the real path of a file path.
 * It could be different than the given path if the file is a symlink
 * or exists in a symlinked directory.
 */


function realpath(path) {
  return _nuclideFs().ROOT_FS.realpath(path);
}
/**
 * Gets the real path of a file path, while expanding tilda paths and symlinks
 * like: ~/abc to its absolute path format.
 */


function resolveRealPath(path) {
  return _nuclideFs().ROOT_FS.realpath(_nuclideUri().default.expandHomeDir(path));
}
/**
 * Returns the specified file path with the home dir ~/ expanded.
 */


function expandHomeDir(path) {
  return Promise.resolve(_nuclideUri().default.expandHomeDir(path));
}
/**
 * Runs the equivalent of `mv sourcePath destinationPath`.
 */


function rename(sourcePath, destinationPath) {
  return _nuclideFs().ROOT_FS.move(sourcePath, destinationPath);
}
/**
 * Moves all sourcePaths into the specified destDir, assumed to be a directory name.
 */


async function move(sourcePaths, destDir) {
  await Promise.all(sourcePaths.map(path => {
    const destPath = _nuclideUri().default.join(destDir, _nuclideUri().default.basename(path));

    return _nuclideFs().ROOT_FS.move(path, destPath);
  }));
}
/**
 * Runs the equivalent of `cp sourcePath destinationPath`.
 * @return true if the operation was successful; false if it wasn't.
 */


async function copy(sourcePath, destinationPath) {
  try {
    await _nuclideFs().ROOT_FS.copy(sourcePath, destinationPath);
  } catch (err) {
    if (err.code === 'EEXIST') {
      // expected if the targetPath already exists
      return false;
    }

    throw err;
  } // TODO: May need to move into ROOT_FS if future filesystems support writing.


  await _fsPromise().default.copyFilePermissions(sourcePath, destinationPath);
  return true;
}
/**
 * Runs the equivalent of `cp -R sourcePath destinationPath`.
 * @return true if the operation was successful; false if it wasn't.
 */


async function copyDir(sourcePath, destinationPath) {
  const oldContents = (await Promise.all([mkdir(destinationPath), readdir(sourcePath)]))[1];
  const didCopyAll = await Promise.all(oldContents.map(([file, isFile]) => {
    const oldItem = _nuclideUri().default.join(sourcePath, file);

    const newItem = _nuclideUri().default.join(destinationPath, file);

    if (isFile) {
      // it's a file, copy it
      return copy(oldItem, newItem);
    } // it's a directory, copy it


    return copyDir(oldItem, newItem);
  })); // Are all the resulting booleans true?

  return didCopyAll.every(b => b);
}
/**
 * Runs the equivalent of `ln -s sourcePath targetPath`
 * `type` is an argument particular to Windows platforms, and will be ignored
 * on any others.
 * @return true if the operation was successful; false if it wasn't.
 */


async function symlink(sourcePath, targetPath, type) {
  try {
    await _nuclideFs().ROOT_FS.symlink(sourcePath, targetPath, type);
  } catch (err) {
    if (err.code === 'EEXIST') {
      // expected if the targetPath already exists
      return false;
    }

    throw err;
  }

  await _fsPromise().default.copyFilePermissions(sourcePath, targetPath);
  return true;
}
/**
 * Removes directories even if they are non-empty. Does not fail if the directory doesn't exist.
 */


function rmdir(path) {
  return _nuclideFs().ROOT_FS.rimraf(path);
}

async function rmdirAll(paths) {
  await Promise.all(paths.map(p => _nuclideFs().ROOT_FS.rimraf(p)));
}
/**
 * The stat endpoint accepts the following query parameters:
 *
 *   path: path to the file to read
 *
 * It returns a JSON encoded stats object that looks something like this:
 *
 * { dev: 2114,
 *  ino: 48064969,
 *  mode: 33188,
 *  nlink: 1,
 *  uid: 85,
 *  gid: 100,
 *  rdev: 0,
 *  size: 527,
 *  blksize: 4096,
 *  blocks: 8,
 *  atime: 'Mon, 10 Oct 2011 23:24:11 GMT',
 *  mtime: 'Mon, 10 Oct 2011 23:24:11 GMT',
 *  ctime: 'Mon, 10 Oct 2011 23:24:11 GMT',
 *  birthtime: 'Mon, 10 Oct 2011 23:24:11 GMT'
 * }
 *
 */


function stat(path) {
  return _nuclideFs().ROOT_FS.stat(path);
}
/**
 * Removes files. Does not fail if the file doesn't exist.
 */


function unlink(path) {
  return _nuclideFs().ROOT_FS.unlink(path).catch(error => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  });
}
/**
 *   path: the path to the file to read
 *   options: options to pass to fs.readFile.
 *      Note that options does NOT include 'encoding' this ensures that the return value
 *      is always a Buffer and never a string.
 *
 *   Callers who want a string should call buffer.toString('utf8').
 */


async function readFile(path, options) {
  return _nuclideFs().ROOT_FS.readFile(path, options);
}

function createReadStream(path, options) {
  return (0, _stream().observeRawStream)(_fs.default.createReadStream(path, options)).publish();
}
/**
 * Returns true if the path being checked exists in a `NFS` mounted directory device.
 */


function isNfs(path) {
  return _nuclideFs().ROOT_FS.isNfs(path);
}
/**
 * Returns true if the path being checked exists in a `Fuse` mounted directory device.
 */


function isFuse(path) {
  return _nuclideFs().ROOT_FS.isFuse(path);
}
/**
 * A small wrapper around fs.writeFile that also implements:
 *
 * - atomic writes (by writing to a temporary file first)
 * - uses a promise rather than a callback
 *
 * `options` is passed directly into fs.writeFile.
 */


function writeFile(path, data, options) {
  // TODO: May need to move into ROOT_FS if future filesystems support writing.
  return _fsPromise().default.writeFileAtomic(path, data, options);
}
/**
 * This is the same as writeFile but with buffers.
 * The RPC framework can't use string | Buffer so we have to create a separate function.
 * Note that options.encoding is ignored for raw buffers.
 */


function writeFileBuffer(path, data, options) {
  return _fsPromise().default.writeFileAtomic(path, data, options);
}

async function getFreeSpace(path) {
  // Only supported on Linux for now.
  if (process.platform !== 'linux') {
    return null;
  } // The output of this command is "Avail\n12345678\n".
  // Just return the first line that parses to an integer.


  return (0, _process().runCommand)('df', ['--output=avail', path]).map(output => {
    for (const line of output.split('\n')) {
      const number = parseInt(line, 10);

      if (Number.isInteger(number)) {
        return number;
      }
    }
  }).toPromise().catch(() => null);
} // Wrapper around fsPromise.tempdir()


async function tempdir(prefix = '') {
  return _fsPromise().default.tempdir(prefix);
}

async function getNuclideDir() {
  return (0, _systemInfo().getNuclideRealDir)();
}

async function getNuclideLogDir() {
  return (0, _nuclideLogging().getPathToLogDir)();
}

async function guessRealPath(path) {
  return _fsPromise().default.guessRealPath(path);
}