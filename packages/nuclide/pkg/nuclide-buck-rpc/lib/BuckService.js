"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRootForPath = getRootForPath;
exports.getBuildFile = getBuildFile;
exports.getOwners = getOwners;
exports.getBuckConfig = getBuckConfig;
exports.build = build;
exports.install = install;
exports.buildWithOutput = buildWithOutput;
exports.testWithOutput = testWithOutput;
exports.installWithOutput = installWithOutput;
exports.runWithOutput = runWithOutput;
exports.listAliases = listAliases;
exports.listFlavors = listFlavors;
exports.showOutput = showOutput;
exports.buildRuleTypeFor = buildRuleTypeFor;
exports.clean = clean;
exports.kill = kill;
exports._buildRuleTypeFor = _buildRuleTypeFor;
exports.getHTTPServerPort = getHTTPServerPort;
exports.query = query;
exports.queryWithArgs = queryWithArgs;
exports.queryWithAttributes = queryWithAttributes;
exports.getWebSocketStream = getWebSocketStream;
exports.getLastBuildCommandInfo = getLastBuildCommandInfo;
exports.resetCompilationDatabaseForSource = resetCompilationDatabaseForSource;
exports.resetCompilationDatabase = resetCompilationDatabase;
exports.getCompilationDatabase = getCompilationDatabase;
exports.isNativeExoPackage = isNativeExoPackage;
exports.isExoPackage = isExoPackage;
exports.MULTIPLE_TARGET_RULE_TYPE = void 0;

function _log4js() {
  const data = require("log4js");

  _log4js = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _process() {
  const data = require("../../../modules/nuclide-commons/process");

  _process = function () {
    return data;
  };

  return data;
}

function _fsPromise() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/fsPromise"));

  _fsPromise = function () {
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

function _createBuckWebSocket() {
  const data = _interopRequireDefault(require("./createBuckWebSocket"));

  _createBuckWebSocket = function () {
    return data;
  };

  return data;
}

function _ini() {
  const data = _interopRequireDefault(require("ini"));

  _ini = function () {
    return data;
  };

  return data;
}

function _BuckClangCompilationDatabase() {
  const data = require("./BuckClangCompilationDatabase");

  _BuckClangCompilationDatabase = function () {
    return data;
  };

  return data;
}

function BuckServiceImpl() {
  const data = _interopRequireWildcard(require("./BuckServiceImpl"));

  BuckServiceImpl = function () {
    return data;
  };

  return data;
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
const MULTIPLE_TARGET_RULE_TYPE = 'multiple_targets'; // All Buck events should contain the fields the members in
// https://phabricator.internmc.facebook.com/diffusion/BUCK/browse/master/src/com/facebook/buck/event/AbstractBuckEvent.java
// Certain events maybe contain additional fields, defined in the interfaces in
// https://phabricator.internmc.facebook.com/diffusion/BUCK/browse/master/src/com/facebook/buck/event/external/events/

exports.MULTIPLE_TARGET_RULE_TYPE = MULTIPLE_TARGET_RULE_TYPE;

/**
 * Given a file path, returns path to the Buck project root i.e. the directory containing
 * '.buckconfig' file.
 */
function getRootForPath(file) {
  return BuckServiceImpl().getRootForPath(file);
}
/**
 * Gets the build file for the specified target.
 */


function getBuildFile(rootPath, targetName, extraArgs) {
  return BuckServiceImpl().getBuildFile(rootPath, targetName, extraArgs);
}
/**
 * Returns an array of strings (that are build targets) by running:
 *
 *     buck query owner(<path>)
 *
 * If `kindFilter` is provided, `kind(kindFilter, owner(..))` will be used.
 *
 * @param filePath absolute path or a local or a remote file.
 * @param kindFilter filter for specific build target kinds.
 * @param extraArguments passed on the command line to buck query
 * @return Promise that resolves to an array of build targets.
 */


function getOwners(rootPath, filePath, extraArguments, kindFilter) {
  return BuckServiceImpl().getOwners(rootPath, filePath, extraArguments, kindFilter);
}
/**
 * Reads the configuration file for the Buck project and returns the requested property.
 *
 * @param section Section in the configuration file.
 * @param property Configuration option within the section.
 *
 * @return Promise that resolves to the value, if it is set, else `null`.
 */


async function getBuckConfig(rootPath, section, property) {
  // NOTE: This function should really just be a call to `buck audit config`.
  // Unfortunately, at time of writing, making such a call takes between 800ms
  // (with buckd warmed and ready to go) to 4 seconds (when restarting buckd),
  // or potentially even 10 seconds (if we need to download a new version of
  // buck). In other words, not viable for performance-sensitive code.
  const buckConfig = await _loadBuckConfig(rootPath);

  if (!buckConfig.hasOwnProperty(section)) {
    return null;
  }

  const sectionConfig = buckConfig[section];

  if (!sectionConfig.hasOwnProperty(property)) {
    return null;
  }

  return _resolveValue(sectionConfig[property], buckConfig);
}
/**
 * TODO(natthu): Also load .buckconfig.local. Consider loading .buckconfig from the home directory
 * and ~/.buckconfig.d/ directory.
 */


async function _loadBuckConfig(rootPath) {
  const header = 'scope = global\n';

  const buckConfigPath = _nuclideUri().default.join(rootPath, '.buckconfig');

  const buckConfigContent = await _readBuckConfigFile(buckConfigPath);
  return _ini().default.parse(header + buckConfigContent);
}
/**
 * Reads a .buckconfig file, resolving any includes which may be contained
 * within. Returns the full buckconfig contents after resolving includes.
 */


async function _readBuckConfigFile(configPath) {
  const contents = await _fsPromise().default.readFile(configPath, 'utf8');

  const configDir = _nuclideUri().default.dirname(configPath);

  return _replaceAsync(/<file:(.*)>$/gm, contents, async (match, includeRelpath) => {
    const includePath = _nuclideUri().default.normalize(_nuclideUri().default.join(configDir, includeRelpath));

    return _readBuckConfigFile(includePath);
  });
}

async function _replaceAsync(regexp, str, callback) {
  const replacePromises = [];
  str.replace(regexp, (...replaceArgs) => {
    replacePromises.push(callback(...replaceArgs));
    return replaceArgs[0];
  });
  const results = await Promise.all(replacePromises);
  return str.replace(regexp, () => results.shift());
}
/**
 * Takes a string `value` pulled from a buckconfig and resolves any
 * `$(config ...)` macros inside, using the data from config.
 */


function _resolveValue(value, config) {
  return value.replace(/\$\(config (.*)\)/g, directive => {
    const requestedConfig = directive.substring(9, directive.length - 1);
    const pieces = requestedConfig.split('.'); // configs should be of the form `foo.bar`

    if (!(pieces.length === 2)) {
      throw new Error("Invariant violation: \"pieces.length === 2\"");
    }

    return config[pieces[0]][pieces[1]];
  });
}
/**
 * Runs `buck build --keep-going --build-report <tempfile>` with the specified targets. Regardless
 * whether the build is successful, this returns the parsed version of the JSON report
 * produced by the {@code --build-report} option:
 * http://facebook.github.io/buck/command/build.html.
 *
 * An error should be thrown only if the specified targets are invalid.
 * @return Promise that resolves to a build report.
 */


function build(rootPath, buildTargets, options) {
  return BuckServiceImpl().build(rootPath, buildTargets, options).toPromise();
}
/**
 * Runs `buck install --keep-going --build-report <tempfile>` with the specified targets.
 *
 * @param run If set to 'true', appends the buck invocation with '--run' to run the
 *   installed application.
 * @param debug If set to 'true', appends the buck invocation with '--wait-for-debugger'
 *   telling the launched application to stop at the loader breakpoint
 *   waiting for debugger to connect
 * @param simulator The UDID of the simulator to install the binary on.
 * @return Promise that resolves to a build report.
 */


function install(rootPath, buildTargets, simulator, run, debug) {
  return BuckServiceImpl()._build(rootPath, buildTargets, {
    install: true,
    simulator,
    run,
    debug
  }).toPromise();
}
/**
 * Same as `build`, but returns additional output via an Observable.
 * @return An Observable with the following implementations:
 *   onNext: Calls the Observer with successive strings from stdout and stderr.
 *     Each update will be of the form: {stdout: string;} | {stderr: string;}
 *     TODO: Use a union to exactly match `{stdout: string;} | {stderr: string;}` when the service
 *     framework supports it. Use an object with optional keys to mimic the union.
 *   onError: If the build fails, calls the Observer with the string output
 *     from stderr.
 *   onCompleted: Only called if the build completes successfully.
 */


function buildWithOutput(rootPath, buildTargets, extraArguments) {
  // TODO(T17463635)
  return _buildWithOutput(rootPath, buildTargets, {
    extraArguments
  }).publish();
}
/**
 * Same as `build`, but returns additional output via an Observable.
 * @return An Observable with the following implementations:
 *   onNext: Calls the Observer with successive strings from stdout and stderr.
 *     Each update will be of the form: {stdout: string;} | {stderr: string;}
 *     TODO: Use a union to exactly match `{stdout: string;} | {stderr: string;}` when the service
 *     framework supports it. Use an object with optional keys to mimic the union.
 *   onError: If the build fails, calls the Observer with the string output
 *     from stderr.
 *   onCompleted: Only called if the build completes successfully.
 */


function testWithOutput(rootPath, buildTargets, extraArguments, debug) {
  // TODO(T17463635)
  return _buildWithOutput(rootPath, buildTargets, {
    test: true,
    extraArguments,
    debug
  }).publish();
}
/**
 * Same as `install`, but returns additional output via an Observable.
 * @return An Observable with the following implementations:
 *   onNext: Calls the Observer with successive strings from stdout and stderr.
 *     Each update will be of the form: {stdout: string;} | {stderr: string;}
 *     TODO: Use a union to exactly match `{stdout: string;} | {stderr: string;}` when the service
 *     framework supports it. Use an object with optional keys to mimic the union.
 *   onError: If the install fails, calls the Observer with the string output
 *     from stderr.
 *   onCompleted: Only called if the install completes successfully.
 */


function installWithOutput(rootPath, buildTargets, extraArguments, simulator, run, debug) {
  // TODO(T17463635)
  return _buildWithOutput(rootPath, buildTargets, {
    install: true,
    simulator,
    run,
    debug,
    extraArguments
  }).publish();
}

function runWithOutput(rootPath, buildTargets, extraArguments, simulator) {
  // TODO(T17463635)
  return _buildWithOutput(rootPath, buildTargets, {
    run: true,
    simulator,
    extraArguments
  }).publish();
}
/**
 * Does a build/install.
 * @return An Observable that returns output from buck, as described by the
 *   docblocks for `buildWithOutput` and `installWithOutput`.
 */


function _buildWithOutput(rootPath, buildTargets, options) {
  // TODO(T17463635)
  const args = BuckServiceImpl()._translateOptionsToBuckBuildArgs({
    baseOptions: Object.assign({}, options),
    buildTargets
  });

  return _rxjsCompatUmdMin.Observable.fromPromise(BuckServiceImpl()._getBuckCommandAndOptions(rootPath)).switchMap(({
    pathToBuck,
    buckCommandOptions
  }) => (0, _process().observeProcess)(pathToBuck, args, Object.assign({}, buckCommandOptions, {
    /* TODO(T17353599) */
    isExitError: () => false
  })).catch(error => _rxjsCompatUmdMin.Observable.of({
    kind: 'error',
    error
  })) // TODO(T17463635)
  .startWith({
    kind: 'stdout',
    data: `Starting "${pathToBuck} ${_getArgsStringSkipClientId(args)}"`
  }));
}

function _getArgsStringSkipClientId(args) {
  const skipped = args.findIndex(arg => arg === 'client.id=nuclide');
  return args.filter((arg, index) => index !== skipped && index !== skipped - 1).join(' ');
}

async function listAliases(rootPath) {
  const args = ['audit', 'alias', '--list'];
  const result = await BuckServiceImpl().runBuckCommandFromProjectRoot(rootPath, args).toPromise();
  const stdout = result.trim();
  return stdout ? stdout.split('\n') : [];
}

async function listFlavors(rootPath, targets, additionalArgs = []) {
  const args = ['audit', 'flavors', '--json'].concat(targets).concat(additionalArgs);

  try {
    const result = await BuckServiceImpl().runBuckCommandFromProjectRoot(rootPath, args).toPromise();
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}
/**
 * Returns the build output metadata for the given target.
 * This will contain one element if the target is unique; otherwise it will
 * contain data for all the targets (e.g. for //path/to/targets:)
 *
 * The build output path is typically contained in the 'buck.outputPath' key.
 */


async function showOutput(rootPath, aliasOrTarget, extraArguments = []) {
  const args = ['targets', '--json', '--show-output', aliasOrTarget].concat(extraArguments);
  const result = await BuckServiceImpl().runBuckCommandFromProjectRoot(rootPath, args).toPromise();
  return JSON.parse(result.trim());
}

async function buildRuleTypeFor(rootPath, aliasesOrTargets) {
  const resolvedRuleTypes = await Promise.all(aliasesOrTargets.trim().split(/\s+/).map(target => _buildRuleTypeFor(rootPath, target)));

  if (resolvedRuleTypes.length === 1) {
    return resolvedRuleTypes[0];
  } else {
    return {
      buildTarget: {
        qualifiedName: aliasesOrTargets,
        flavors: []
      },
      type: MULTIPLE_TARGET_RULE_TYPE
    };
  }
}

async function clean(rootPath) {
  await BuckServiceImpl().runBuckCommandFromProjectRoot(rootPath, ['clean']).toPromise();
}

async function kill(rootPath) {
  await BuckServiceImpl().runBuckCommandFromProjectRoot(rootPath, ['kill'], {}, false).toPromise();
}

async function _buildRuleTypeFor(rootPath, aliasOrTarget) {
  let flavors;

  if (aliasOrTarget.includes('#')) {
    const nameComponents = aliasOrTarget.split('#');
    flavors = nameComponents.length === 2 ? nameComponents[1].split(',') : [];
  } else {
    flavors = [];
  }

  const canonicalName = _normalizeNameForBuckQuery(aliasOrTarget);

  let result;

  try {
    result = await BuckServiceImpl().query(rootPath, canonicalName, ['--output-attributes', 'buck.type']).toPromise();
  } catch (error) {
    (0, _log4js().getLogger)('nuclide-buck-rpc').error(error.message);
    return null;
  } // If aliasOrTarget is an alias, targets[0] will be the fully qualified build target.


  const targets = Object.keys(result);

  if (targets.length === 0) {
    return null;
  }

  let qualifiedName;
  let type; // target: and target/... build a set of targets.
  // These don't have a single rule type so let's just return something.

  if (targets.length > 1) {
    qualifiedName = canonicalName;
    type = MULTIPLE_TARGET_RULE_TYPE;
  } else {
    qualifiedName = targets[0];
    type = result[qualifiedName]['buck.type'];
  }

  return {
    buildTarget: {
      qualifiedName,
      flavors
    },
    type
  };
} // Buck query doesn't allow omitting // or adding # for flavors, this needs to be fixed in buck.


function _normalizeNameForBuckQuery(aliasOrTarget) {
  let canonicalName = aliasOrTarget; // Don't prepend // for aliases (aliases will not have colons or .)

  if ((canonicalName.indexOf(':') !== -1 || canonicalName.indexOf('.') !== -1) && canonicalName.indexOf('//') === -1) {
    canonicalName = '//' + canonicalName;
  } // Strip flavor string


  const flavorIndex = canonicalName.indexOf('#');

  if (flavorIndex !== -1) {
    canonicalName = canonicalName.substr(0, flavorIndex);
  }

  return canonicalName;
}

const _cachedPorts = new Map(); // Returns -1 if the port can't be obtained (e.g. calling `buck server` fails)


async function getHTTPServerPort(rootPath) {
  let port = _cachedPorts.get(rootPath);

  if (port != null) {
    if (port === -1) {
      return port;
    } // If there are other builds on the promise queue, wait them out.
    // This ensures that we don't return the port for another build.


    await BuckServiceImpl().getPool(rootPath, false).submit(() => Promise.resolve());
    const msg = await getWebSocketStream(rootPath, port).refCount().take(1).toPromise().catch(() => null);

    if (msg != null && msg.type === 'SocketConnected') {
      return port;
    }
  }

  const args = ['server', 'status', '--json', '--http-port'];

  try {
    const result = await BuckServiceImpl().runBuckCommandFromProjectRoot(rootPath, args).toPromise();
    const json = JSON.parse(result);
    port = json['http.port'];

    _cachedPorts.set(rootPath, port);

    return port;
  } catch (error) {
    (0, _log4js().getLogger)('nuclide-buck-rpc').warn(`Failed to get httpPort for ${_nuclideUri().default.getPath(rootPath)}`, error);
    return -1;
  }
}
/** Runs `buck query --json` with the specified query. */


function query(rootPath, queryString, extraArguments) {
  return BuckServiceImpl().query(rootPath, queryString, extraArguments).toPromise();
}
/**
 * Runs `buck query --json` with a query that contains placeholders and therefore expects
 * arguments.
 * @param query Should contain '%s' placeholders.
 * @param args Should be a list of build targets or aliases. The query will be run for each arg.
 *   It will be substituted for '%s' when it is run.
 * @return object where each arg in args will be a key. Its corresponding value will be the list
 *   of matching build targets in its results.
 */


async function queryWithArgs(rootPath, queryString, args) {
  const result = await BuckServiceImpl().query(rootPath, queryString, args).toPromise(); // `buck query` does not include entries in the JSON for params that did not match anything. We
  // massage the output to ensure that every argument has an entry in the output.

  for (const arg of args) {
    if (!result.hasOwnProperty(arg)) {
      result[arg] = [];
    }
  }

  return result;
}
/**
 * Executes a query with additional attributes.
 * Example output:
 *   queryWithAttributes(rootPath, 'owner(foo.py)', ['buck.type', 'deps']) =>
 *   {
 *      "//foo:foo": {
 *        "buck.type": "python_library",
 *        "deps": [],
 *      }
 *   }
 */


async function queryWithAttributes(rootPath, queryString, attributes) {
  const result = await BuckServiceImpl().query(rootPath, queryString, ['--output-attributes', ...attributes]).toPromise();
  return result;
} // TODO: Nuclide's RPC framework won't allow BuckWebSocketMessage here unless we cover
// all possible message types. For now, we'll manually typecast at the callsite.


function getWebSocketStream(rootPath, httpPort) {
  return (0, _createBuckWebSocket().default)(httpPort).publish();
}

const LOG_PATH = 'buck-out/log/last_buildcommand/buck-machine-log';
const INVOCATIONINFO_REGEX = /InvocationInfo ({.+})/;

async function getLastBuildCommandInfo(rootPath) {
  // Buck machine log has the format < Event type >< space >< JSON >, one per line.
  // https://buckbuild.com/concept/buckconfig.html#log.machine_readable_logger_enabled
  const logFile = _nuclideUri().default.join(rootPath, LOG_PATH);

  if (await _fsPromise().default.exists(logFile)) {
    let line;

    try {
      line = await (0, _process().runCommand)('head', ['-n', '1', logFile]).toPromise();
    } catch (err) {
      return null;
    }

    const matches = INVOCATIONINFO_REGEX.exec(line);

    if (matches == null || matches.length < 2) {
      return null;
    }

    try {
      const invocationParams = JSON.parse(matches[1]); // Invocation fields defined in buck/log/AbstractInvocationInfo.java

      return {
        timestamp: invocationParams.timestampMillis,
        command: 'build',
        args: invocationParams.unexpandedCommandArgs.slice(1)
      };
    } catch (err) {
      // If it doesn't parse then just give up.
      return null;
    }
  }

  return null;
}

async function resetCompilationDatabaseForSource(src, params) {
  (0, _BuckClangCompilationDatabase().getCompilationDatabaseHandler)(params).resetForSource(src);
}

async function resetCompilationDatabase(params) {
  (0, _BuckClangCompilationDatabase().getCompilationDatabaseHandler)(params).reset();
}

function getCompilationDatabase(src, params) {
  return (0, _BuckClangCompilationDatabase().getCompilationDatabaseHandler)(params).getCompilationDatabase(src).publish();
}

function isNativeExoPackage(rootPath, target) {
  return _rxjsCompatUmdMin.Observable.defer(async () => {
    const exoPackageModes = await getExoPackageModes(rootPath, target);
    return exoPackageModes.indexOf('native_library') >= 0;
  }).publish();
}

function isExoPackage(rootPath, target) {
  return _rxjsCompatUmdMin.Observable.defer(async () => {
    const exoPackageModes = await getExoPackageModes(rootPath, target);
    return exoPackageModes.length > 0;
  }).publish();
}

async function getExoPackageModes(rootPath, target) {
  const attributes = await queryWithAttributes(rootPath, target, ['exopackage_modes']);

  if (attributes[target] != null && attributes[target].exopackage_modes instanceof Array) {
    return attributes[target].exopackage_modes;
  } else {
    return [];
  }
}