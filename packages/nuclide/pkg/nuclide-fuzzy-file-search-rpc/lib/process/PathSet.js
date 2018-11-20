"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PathSet = void 0;

function _fsPromise() {
  const data = _interopRequireDefault(require("../../../../modules/nuclide-commons/fsPromise"));

  _fsPromise = function () {
    return data;
  };

  return data;
}

var _os = _interopRequireDefault(require("os"));

function _minimatch() {
  const data = require("minimatch");

  _minimatch = function () {
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

function _nuclideFuzzyNative() {
  const data = require("../../../../modules/nuclide-fuzzy-native");

  _nuclideFuzzyNative = function () {
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
const EXACT_MATCH_SCORE = 1.0;

class PathSet {
  /**
   * To improve working with multiple active directories, include the basename
   * of the parent directory in the matched filenames.
   * This class will invisibly add/strip the basename as necessary.
   */
  constructor(paths, ignoredNames, rootPath) {
    this._ignoredPatterns = ignoredNames.map(name => (0, _minimatch().makeRe)(name, {
      matchBase: true,
      dot: true
    })) // makeRe returns false for invalid patterns.
    .filter(x => x);
    this._rootPath = rootPath;
    this._basename = _nuclideUri().default.basename(rootPath);
    this._matcher = new (_nuclideFuzzyNative().Matcher)(this._transformPaths(paths));
  }

  addPaths(paths) {
    this._matcher.addCandidates(this._transformPaths(paths));
  }

  removePaths(paths) {
    this._matcher.removeCandidates(this._transformPaths(paths));
  }
  /**
   * Attempt to relativize paths that people might e.g. copy + paste.
   * For example, with the `rootPath` "/code" and query "/code/index.php",
   * we would return "index.php" which is a relative path to `rootPath`.
   *
   * @param {string} query: the user query
   * @param {string} rootPath: the project directory
   */


  _getRelativeQuery(query, rootPath) {
    let relQuery = query; // Remove the leading home directory qualifier.

    if (relQuery.startsWith('~/')) {
      relQuery = relQuery.substr(2);
    } // If a full path is pasted, make the path relative.


    if (relQuery.startsWith(rootPath)) {
      relQuery = relQuery.substr(rootPath.length);
    }

    return relQuery;
  }
  /**
   * Search for file that is an exact-match. An exact-match is found
   * when the file path that the user inputs 100% matches a file path
   * within the project, no matter whether it's ignored by VCS or not.
   *
   * @param {string} relQuery: the user query relative to the project folder
   * @param {string} rootPath: the project directory
   */


  async _getExactMatch(relQuery, rootPath) {
    const fullPathToTest = _nuclideUri().default.resolve(rootPath, relQuery);

    const stats = await _fsPromise().default.stat(fullPathToTest).catch(() => null); // Only match files and ignore directories

    if (stats == null || !stats.isFile()) {
      return null;
    } // Since it's a full match, we could just highlight
    // indices ranging from the last index of `relQuery`
    // to the last one.


    const matchIndexes = [];

    for (let i = fullPathToTest.lastIndexOf(relQuery); i < fullPathToTest.length; i++) {
      matchIndexes.push(i);
    }

    return {
      score: EXACT_MATCH_SCORE,
      path: fullPathToTest,
      matchIndexes
    };
  }
  /**
   * Given a set of FileSearchResult `matches`, determine
   * if a given FileSearchResult `matchToTest` has a duplicated
   * path with any item within `matches`.
   */


  _isExistingMatch(matches, matchToTest) {
    return matches.some(match => match.path === matchToTest.path);
  }

  async query(query, options = Object.freeze({})) {
    const rootPath = _nuclideUri().default.ensureTrailingSeparator(this._rootPath);

    const basePath = _nuclideUri().default.ensureTrailingSeparator(_nuclideUri().default.dirname(rootPath));

    const relQuery = this._getRelativeQuery(query, rootPath);

    let relQueryRoot;
    const {
      queryRoot,
      smartCase
    } = options;

    if (queryRoot !== undefined && _nuclideUri().default.contains(basePath, queryRoot)) {
      relQueryRoot = _nuclideUri().default.relative(basePath, queryRoot);
    }

    const cpus = _os.default.cpus(); // Start some promises used below to help parallelization


    const exactMatchPromise = this._getExactMatch(relQuery, rootPath); // Step 1 - Do regular file search. This would not search files
    // that are ignored by Mercurial.


    const matches = this._matcher.match(relQuery, {
      maxResults: 20,
      numThreads: cpus ? Math.max(1, cpus.length) : 1,
      recordMatchIndexes: true,
      rootPath: relQueryRoot,
      smartCase
    }) // Expand the search results to the full path.
    .map(result => {
      let {
        matchIndexes
      } = result;

      if (matchIndexes != null) {
        matchIndexes = matchIndexes.map(idx => idx + basePath.length) // Discard all matching characters in the basepath.
        // It can be a little confusing when the highlights don't match, but unless
        // the basename is explicitly used in the query this usually doesn't happen.
        .filter(idx => idx >= rootPath.length);
      }

      return {
        score: result.score,
        // We are not using nuclideUri.resolve here
        // since we rely on idx + basePath.length above
        path: basePath + result.value,
        matchIndexes: matchIndexes || []
      };
    }); // Step 2 - If the file being queried exists but is ignored by
    // VCS, we should still return the file.
    //
    // See also: T14863530


    const exactMatch = await exactMatchPromise;

    if (exactMatch != null && !this._isExistingMatch(matches, exactMatch)) {
      matches.push(exactMatch);
    }

    return matches;
  }

  _isIgnored(path) {
    // This is 2x as fast as using Array.some...
    for (let i = 0; i < this._ignoredPatterns.length; i++) {
      if (this._ignoredPatterns[i].test(path)) {
        return true;
      }
    }

    return false;
  } // Append the basename to paths in the index.


  _transformPaths(paths) {
    return paths.filter(path => !this._isIgnored(path)).map(path => _nuclideUri().default.join(this._basename, path));
  }

}

exports.PathSet = PathSet;