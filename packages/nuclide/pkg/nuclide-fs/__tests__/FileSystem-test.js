"use strict";

var _fs = _interopRequireDefault(require("fs"));

function _admZip() {
  const data = _interopRequireDefault(require("adm-zip"));

  _admZip = function () {
    return data;
  };

  return data;
}

function _FileSystem() {
  const data = require("../lib/FileSystem");

  _FileSystem = function () {
    return data;
  };

  return data;
}

function _FsFileSystem() {
  const data = require("../lib/FsFileSystem");

  _FsFileSystem = function () {
    return data;
  };

  return data;
}

function _ZipFileSystem() {
  const data = require("../lib/ZipFileSystem");

  _ZipFileSystem = function () {
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 *  strict-local
 * @format
 * @emails oncall+nuclide
 */
const fixtures = _nuclideUri().default.join(__dirname, '../__mocks__/fixtures');

const PARENT_TEXT = 'Parent directory text file contents\n';
const CHILD_TEXT = 'Child directory text file contents\n';
const PARENT_DIR = [// name, isFile, isSymbolicLink
['Directory', false, false], ['EmptyDirectory', false, false], ['EmptyFile', true, false], ['LinkDirectory', false, true], ['LinkDirectorySlashTextFile.txt', false, true], ['LinkLinkDirectory', false, true], ['LinkLinkDirectorySlashTextFile.txt', true, true], ['TextFile.txt', true, false]];
const CHILD_DIR = [// name, isFile, isSymbolicLink
['LinkDotDotSlashTextFile.txt', true, true], ['TextFile.txt', true, false]];
const MODE_RWXR_XR_X = 0b111101101;
const MODE_RW_R__R__ = 0b110100100; // eslint-disable-next-line no-bitwise

const MODE_FILE = 0x8 << 12; // eslint-disable-next-line no-bitwise

const MODE_DIRECTORY = 0x4 << 12; // eslint-disable-next-line no-bitwise

const MODE_SYMLINK = 0xa << 12;

function statsDir() {
  return {
    // eslint-disable-next-line no-bitwise
    mode: MODE_DIRECTORY | MODE_RWXR_XR_X,
    size: 0,
    isFile: false,
    isDirectory: true,
    isSymbolicLink: false
  };
}

function statsFile(size) {
  return {
    // eslint-disable-next-line no-bitwise
    mode: MODE_FILE | MODE_RW_R__R__,
    size,
    isFile: true,
    isDirectory: false,
    isSymbolicLink: false
  };
}

function statsDirLink() {
  return {
    // eslint-disable-next-line no-bitwise
    mode: MODE_SYMLINK | MODE_RWXR_XR_X,
    size: 0,
    isFile: false,
    isDirectory: false,
    isSymbolicLink: true
  };
}

function statsFileLink(size) {
  return {
    // eslint-disable-next-line no-bitwise
    mode: MODE_SYMLINK | MODE_RWXR_XR_X,
    size,
    isFile: false,
    isDirectory: false,
    isSymbolicLink: true
  };
}

describe('FsFS', () => {
  const fsFs = new (_FsFileSystem().FsFileSystem)();
  const dir = fixture('dir'); // I want to include an empty directory test, but source control
  // systems do not track empty directories.  So ensure this exists.

  const emptyDir = fixture('dir/EmptyDirectory');

  try {
    _fs.default.mkdirSync(emptyDir);
  } catch (e) {}

  describe('dir', () => {
    checkRoot(fsFs, dir, dir, true, _nuclideUri().default.join);
  });
  describe('dir/Directory/..', () => {
    const dotDotDir = fixture('dir/Directory/..');
    checkRoot(fsFs, dotDotDir, dir, true, _nuclideUri().default.join);
  });
});
describe('ZipFS dir.zip', () => {
  const zip = new (_admZip().default)(fixture('dir.zip'));
  const zipFs = new (_ZipFileSystem().ZipFileSystem)(zip, new _fs.default.Stats(), new _fs.default.Stats());
  checkRoot(zipFs, 'dir', 'dir', false, _nuclideUri().default.join);
});
describe('ZipFS dir.jar', () => {
  const jar = new (_admZip().default)(fixture('dir.jar'));
  const zipFs = new (_ZipFileSystem().ZipFileSystem)(jar, new _fs.default.Stats(), new _fs.default.Stats());
  checkRoot(zipFs, 'dir', 'dir', false, _nuclideUri().default.join);
});

function checkRoot(checkFs, linkRootPath, realRootPath, checkLinks, rootJoin) {
  const linkPath = path => rootJoin(linkRootPath, path);

  const realPath = path => rootJoin(realRootPath, path);

  describe('root', () => {
    checkRealPath(linkRootPath, realRootPath);
    checkReaddir(linkRootPath, PARENT_DIR);
  });
  describe('Directory', () => {
    const directory = linkPath('Directory');
    checkExistingPath(directory);
    checkBothStat(directory, statsDir());
    checkRealPath(directory, realPath('Directory'));
    checkReaddir(directory, CHILD_DIR);
    describe('TextFile', () => {
      const directoryTextFile = linkPath('Directory/TextFile.txt');
      checkExistingPath(directoryTextFile);
      checkBothStat(directoryTextFile, statsFile(CHILD_TEXT.length));
      checkRealPath(directoryTextFile, realPath('Directory/TextFile.txt'));
      checkTextFile(directoryTextFile, CHILD_TEXT);
    });
    describe('DoesNotExit.txt', () => {
      const directoryNonExist = linkPath('Directory/DoesNotExist.txt');
      checkNonExistingPath(directoryNonExist);
    });
  });
  describe('EmptyDirectory', () => {
    const emptyDirectory = linkPath('EmptyDirectory');
    checkExistingPath(emptyDirectory);
    checkBothStat(emptyDirectory, statsDir());
    checkRealPath(emptyDirectory, realPath('EmptyDirectory'));
    checkReaddir(emptyDirectory, []);
  });
  describe('EmptyFile', () => {
    const emptyFile = linkPath('EmptyFile');
    checkExistingPath(emptyFile);
    checkBothStat(emptyFile, statsFile(0));
    checkRealPath(emptyFile, realPath('EmptyFile'));
    checkTextFile(emptyFile, '');
  });
  describe('TextFile', () => {
    const textFile = linkPath('TextFile.txt');
    checkExistingPath(textFile);
    checkBothStat(textFile, statsFile(PARENT_TEXT.length));
    checkRealPath(textFile, realPath('TextFile.txt'));
    checkTextFile(textFile, PARENT_TEXT);
  });
  describe('DoesNotExit.txt', () => {
    const nonExit = linkPath('DoesNotExist.txt');
    checkNonExistingPath(nonExit);
  });

  if (checkLinks) {
    describe('LinkDirectory', () => {
      const linkDirectory = linkPath('LinkDirectory');
      checkExistingPath(linkDirectory);
      checkStat(linkDirectory, statsDir());
      checkLStat(linkDirectory, statsDirLink(), {
        checkLinksMode: false
      });
      checkRealPath(linkDirectory, realPath('Directory'));
      checkReaddir(linkDirectory, CHILD_DIR);
    });
    describe('LinkLinkDirectory', () => {
      const linkLinkDirectory = linkPath('LinkLinkDirectory');
      checkExistingPath(linkLinkDirectory);
      checkStat(linkLinkDirectory, statsDir());
      checkLStat(linkLinkDirectory, statsDirLink(), {
        checkLinksMode: false
      });
      checkRealPath(linkLinkDirectory, realPath('Directory'));
      checkReaddir(linkLinkDirectory, CHILD_DIR);
    });
    describe('LinkDirectorySlashTextFile', () => {
      const linkDirectoryTextFile = linkPath('LinkDirectorySlashTextFile.txt');
      checkExistingPath(linkDirectoryTextFile);
      checkStat(linkDirectoryTextFile, statsFile(CHILD_TEXT.length));
      checkLStat(linkDirectoryTextFile, statsFileLink(CHILD_TEXT.length), {
        checkLinksMode: false
      });
      checkRealPath(linkDirectoryTextFile, realPath('Directory/TextFile.txt'));
      checkTextFile(linkDirectoryTextFile, CHILD_TEXT);
    });
    describe('LinkLinkDirectorySlashTextFile', () => {
      const linkLinkDirectoryTextFile = linkPath('LinkLinkDirectorySlashTextFile.txt');
      checkExistingPath(linkLinkDirectoryTextFile);
      checkStat(linkLinkDirectoryTextFile, statsFile(CHILD_TEXT.length));
      checkLStat(linkLinkDirectoryTextFile, statsFileLink(CHILD_TEXT.length), {
        checkLinksMode: false
      });
      checkRealPath(linkLinkDirectoryTextFile, realPath('Directory/TextFile.txt'));
      checkTextFile(linkLinkDirectoryTextFile, CHILD_TEXT);
    });
  }

  function checkExistingPath(path) {
    describe(path, () => {
      it('exists', async () => {
        expect((await checkFs.exists(path))).toBeTruthy();
      });
      it('can be found', async () => {
        const dir = _nuclideUri().default.dirname(path);

        const base = _nuclideUri().default.basename(path);

        expect((await checkFs.findNearestFile(base, dir))).toEqual(dir);
      });
      it('is not NFS', async () => {
        expect((await checkFs.isNfs(path))).toBe(false);
      });
    });
  }

  function checkNonExistingPath(path) {
    describe(path, () => {
      it('does not exist', async () => {
        expect((await checkFs.exists(path))).toBe(false);
      });
    });
  }

  function checkBothStat(path, expected) {
    checkStat(path, expected);
    checkLStat(path, expected);
  }

  function checkStat(path, expected) {
    describe('stat', () => {
      checkStatValues(() => checkFs.stat(path), expected);
    });
  }

  function checkLStat(path, expected, options = {}) {
    describe('lstat', () => {
      checkStatValues(() => checkFs.lstat(path), expected, {
        checkLinksMode: options.checkLinksMode
      });
    });
  }

  function checkStatValues(get, expected, options = {}) {
    let actual;
    beforeEach(async () => {
      actual = await get();
    }); // Symlinks' mode on Linux is always ignored

    if (options.checkLinksMode !== false) {
      it('has correct mode', () => {
        expect(actual.mode).toEqual(expected.mode);
      });
    }

    it('has correct isFile', () => {
      expect(actual.isFile()).toEqual(expected.isFile);
    });
    it('has correct isDirectory', () => {
      expect(actual.isDirectory()).toEqual(expected.isDirectory);
    });
    it('has correct isSymbolicLink', () => {
      expect(actual.isSymbolicLink()).toEqual(expected.isSymbolicLink);
    });

    if (expected.isFile) {
      it('has correct size', () => {
        expect(actual.size).toEqual(expected.size);
      });
    }
  }

  function checkReaddir(path, expected) {
    describe('readdir', () => {
      let actual;
      beforeEach(async () => {
        actual = await checkFs.readdir(path);
      });
      it('has expected names', () => {
        expect(names(actual)).toEqual(names(expected));
      });
    });
  }

  function checkRealPath(path, expected) {
    describe('realpath', () => {
      it('has expected value', async () => {
        expect((await checkFs.realpath(path))).toEqual(expected);
      });
    });
  }

  function checkTextFile(path, contents) {
    describe(`text file ${_nuclideUri().default.basename(path)}`, () => {
      checkExistingPath(path);
      checkText(path, contents);
    });
  }

  function checkText(path, contents) {
    describe(path, () => {
      it('has expected contents', async () => {
        expect((await checkFs.readFile(path)).toString()).toEqual(contents);
      });
    });
  }
}

function fixture(dir, archiveOffset) {
  const fsDir = _nuclideUri().default.join(fixtures, dir);

  if (archiveOffset == null) {
    return fsDir;
  } else {
    return _nuclideUri().default.archiveJoin(fsDir, archiveOffset);
  }
}

function names(entries) {
  return entries.map(([name, isFile, isLink]) => name);
}