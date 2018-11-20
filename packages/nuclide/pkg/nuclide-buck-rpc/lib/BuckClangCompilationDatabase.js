"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getCompilationDatabaseHandler = getCompilationDatabaseHandler;

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _SimpleCache() {
  const data = require("../../../modules/nuclide-commons/SimpleCache");

  _SimpleCache = function () {
    return data;
  };

  return data;
}

function ClangService() {
  const data = _interopRequireWildcard(require("../../nuclide-clang-rpc"));

  ClangService = function () {
    return data;
  };

  return data;
}

function BuckService() {
  const data = _interopRequireWildcard(require("./BuckServiceImpl"));

  BuckService = function () {
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

function _nuclideUri() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
    return data;
  };

  return data;
}

function _utils() {
  const data = require("../../nuclide-clang-rpc/lib/utils");

  _utils = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
const logger = (0, _log4js().getLogger)('nuclide-buck');
const BUCK_TIMEOUT = 10 * 60 * 1000;
const TARGET_KIND_REGEX = ['apple_binary', 'apple_library', 'apple_test', 'cxx_binary', 'cxx_library', 'cxx_test'].join('|');
/**
 * Facebook puts all headers in a <target>:__default_headers__ build target by default.
 * This target will never produce compilation flags, so make sure to ignore it.
 */

const DEFAULT_HEADERS_TARGET = '__default_headers__';

class BuckClangCompilationDatabaseHandler {
  // Ensure that we can clear targetCache for a given file.
  constructor(params) {
    this._targetCache = new (_SimpleCache().SimpleCache)({
      keyFactory: JSON.stringify
    });
    this._sourceCache = new (_SimpleCache().SimpleCache)();
    this._sourceToTargetKey = new Map();
    this._params = params;
  }

  resetForSource(src) {
    this._sourceCache.delete(src);

    const targetKey = this._sourceToTargetKey.get(src);

    if (targetKey != null) {
      this._targetCache.delete(targetKey);

      this._sourceToTargetKey.delete(src);
    }
  }

  reset() {
    this._sourceCache.clear();

    this._targetCache.clear();

    this._sourceToTargetKey.clear();
  }

  getCompilationDatabase(file) {
    return this._sourceCache.getOrCreate(file, () => {
      if ((0, _utils().isHeaderFile)(file)) {
        return _rxjsCompatUmdMin.Observable.fromPromise(ClangService().getRelatedSourceOrHeader(file)).switchMap(source => {
          if (source != null) {
            logger.info(`${file} is a header, thus using ${source} for getting the compilation flags.`);
            return this.getCompilationDatabase(source);
          } else {
            logger.error(`Couldn't find a corresponding source file for ${file}, thus there are no compilation flags available.`);
            return _rxjsCompatUmdMin.Observable.fromPromise((0, _utils().guessBuildFile)(file)).map(flagsFile => ({
              file: null,
              flagsFile,
              libclangPath: null,
              warnings: [`I could not find a corresponding source file for ${file}.`]
            })).publishLast().refCount();
          }
        });
      } else {
        return this._getCompilationDatabase(file).publishLast().refCount();
      }
    });
  }

  _getCompilationDatabase(file) {
    return _rxjsCompatUmdMin.Observable.fromPromise(BuckService().getRootForPath(file)).switchMap(buckRoot => this._loadCompilationDatabaseFromBuck(file, buckRoot).catch(err => {
      logger.error('Error getting flags from Buck for file ', file, err);
      throw err;
    }).do(db => {
      if (db != null) {
        this._cacheFilesToCompilationDB(db);
      }
    }));
  }

  _loadCompilationDatabaseFromBuck(src, buckRoot) {
    if (buckRoot == null) {
      return _rxjsCompatUmdMin.Observable.of(null);
    }

    return (this._params.args.length === 0 ? _rxjsCompatUmdMin.Observable.fromPromise(BuckService()._getPreferredArgsForRepo(buckRoot)) : _rxjsCompatUmdMin.Observable.of(this._params.args)).switchMap(extraArgs => {
      return _rxjsCompatUmdMin.Observable.fromPromise(BuckService().getOwners(buckRoot, src, extraArgs, TARGET_KIND_REGEX, false)).map(owners => owners.filter(x => x.indexOf(DEFAULT_HEADERS_TARGET) === -1)).map(owners => {
        // Deprioritize Android-related targets because they build with gcc and
        // require gcc intrinsics that cause libclang to throw bad diagnostics.
        owners.sort((a, b) => {
          const aAndroid = a.endsWith('Android');
          const bAndroid = b.endsWith('Android');

          if (aAndroid && !bAndroid) {
            return 1;
          } else if (!aAndroid && bAndroid) {
            return -1;
          } else {
            return 0;
          }
        });
        return owners[0];
      }).switchMap(target => {
        if (target == null) {
          // Even if we can't get flags, return a flagsFile to watch
          return _rxjsCompatUmdMin.Observable.fromPromise((0, _utils().guessBuildFile)(src)).map(flagsFile => flagsFile != null ? {
            file: null,
            flagsFile,
            libclangPath: null,
            warnings: [`I could not find owner target of ${src}`, `Is there an error in ${flagsFile}?`]
          } : null);
        } else {
          this._sourceToTargetKey.set(src, this._targetCache.keyForArgs([buckRoot, target, extraArgs]));

          return this._targetCache.getOrCreate([buckRoot, target, extraArgs], () => this._loadCompilationDatabaseForBuckTarget(buckRoot, target, extraArgs).publishLast().refCount());
        }
      }).catch(err => {
        logger.error('Failed getting the target from buck', err);
        return _rxjsCompatUmdMin.Observable.of(null);
      });
    });
  }

  _loadCompilationDatabaseForBuckTarget(buckProjectRoot, target, extraArgs) {
    const flavors = ['compilation-database', ...this._params.flavorsForTarget];
    return (this._params.useDefaultPlatform ? _rxjsCompatUmdMin.Observable.fromPromise(BuckService().getDefaultPlatform(buckProjectRoot, target, extraArgs, false)).map(platform => flavors.concat([platform])) : _rxjsCompatUmdMin.Observable.of(flavors)).map(allFlavors => target + '#' + allFlavors.join(',')).switchMap(buildTarget => {
      return BuckService().build(buckProjectRoot, [// Small builds, like those used for a compilation database, can degrade overall
      // `buck build` performance by unnecessarily invalidating the Action Graph cache.
      // See https://buckbuild.com/concept/buckconfig.html#client.skip-action-graph-cache
      // for details on the importance of using skip-action-graph-cache=true.
      '--config', 'client.skip-action-graph-cache=true', buildTarget, ...extraArgs], {
        commandOptions: {
          timeout: BUCK_TIMEOUT
        }
      }).switchMap(buildReport => {
        if (!buildReport.success) {
          const error = new Error(`Failed to build ${buildTarget}`);
          logger.error(error);
          throw error;
        }

        const firstResult = Object.keys(buildReport.results)[0];
        let pathToCompilationDatabase = buildReport.results[firstResult].output;
        pathToCompilationDatabase = _nuclideUri().default.join(buckProjectRoot, pathToCompilationDatabase);
        return _rxjsCompatUmdMin.Observable.fromPromise(BuckService().getBuildFile(buckProjectRoot, target, extraArgs)).switchMap(buildFile => _rxjsCompatUmdMin.Observable.fromPromise(this._processCompilationDb({
          file: pathToCompilationDatabase,
          flagsFile: buildFile,
          libclangPath: null,
          target,
          warnings: []
        }, buckProjectRoot, extraArgs)));
      });
    });
  }

  async _processCompilationDb(db, buckRoot, args) {
    try {
      // $FlowFB
      const {
        createOmCompilationDb
      } = require("./fb/omCompilationDb");

      return await createOmCompilationDb(db, buckRoot, args);
    } catch (e) {}

    return db;
  }

  async _cacheFilesToCompilationDB(db) {
    const {
      file
    } = db;

    if (file == null) {
      return;
    }

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line nuclide-internal/unused-subscription
      ClangService().loadFilesFromCompilationDatabaseAndCacheThem(file, db.flagsFile).refCount().subscribe(path => this._sourceCache.set(path, _rxjsCompatUmdMin.Observable.of(db)), reject, // on error
      resolve // on complete
      );
    });
  }

}

const compilationDatabaseHandlerCache = new (_SimpleCache().SimpleCache)({
  keyFactory: params => JSON.stringify(params)
});

function getCompilationDatabaseHandler(params) {
  return compilationDatabaseHandlerCache.getOrCreate(params, () => new BuckClangCompilationDatabaseHandler(params));
}