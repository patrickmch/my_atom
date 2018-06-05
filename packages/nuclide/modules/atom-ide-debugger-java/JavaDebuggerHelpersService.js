'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPortForJavaDebugger = getPortForJavaDebugger;
exports.getJavaVSAdapterExecutableInfo = getJavaVSAdapterExecutableInfo;
exports.prepareForTerminalLaunch = prepareForTerminalLaunch;
exports.javaDebugWaitForJdwpProcessStart = javaDebugWaitForJdwpProcessStart;
exports.javaDebugWaitForJdwpProcessExit = javaDebugWaitForJdwpProcessExit;

var _fsPromise;

function _load_fsPromise() {
  return _fsPromise = _interopRequireDefault(require('../nuclide-commons/fsPromise'));
}

var _nuclideUri;

function _load_nuclideUri() {
  return _nuclideUri = _interopRequireDefault(require('../nuclide-commons/nuclideUri'));
}

var _UniversalDisposable;

function _load_UniversalDisposable() {
  return _UniversalDisposable = _interopRequireDefault(require('../nuclide-commons/UniversalDisposable'));
}

var _os = _interopRequireDefault(require('os'));

var _process;

function _load_process() {
  return _process = require('../nuclide-commons/process');
}

var _rxjsBundlesRxMinJs = require('rxjs/bundles/Rx.min.js');

var _serverPort;

function _load_serverPort() {
  return _serverPort = require('../nuclide-commons/serverPort');
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const JAVA = 'java'; /**
                      * Copyright (c) 2017-present, Facebook, Inc.
                      * All rights reserved.
                      *
                      * This source code is licensed under the BSD-style license found in the
                      * LICENSE file in the root directory of this source tree. An additional grant
                      * of patent rights can be found in the PATENTS file in the same directory.
                      *
                      * 
                      * @format
                      */

async function getPortForJavaDebugger() {
  return (0, (_serverPort || _load_serverPort()).getAvailableServerPort)();
}

async function getJavaVSAdapterExecutableInfo(debug) {
  return {
    command: JAVA,
    args: await _getJavaArgs(debug)
  };
}

async function prepareForTerminalLaunch(config) {
  const { classPath, entryPointClass } = config;
  const launchPath = (_nuclideUri || _load_nuclideUri()).default.expandHomeDir(classPath);
  const attachPort = await (0, (_serverPort || _load_serverPort()).getAvailableServerPort)();

  // Note: the attach host is passed to the Java debugger engine, which
  // runs on the RPC side of Nuclide, so it is fine to always pass localhost
  // as the host name, even if the Nuclide client is on a different machine.
  const attachHost = '127.0.0.1';
  return Promise.resolve({
    attachPort,
    attachHost,
    launchCommand: 'java',
    launchCwd: launchPath,
    targetExecutable: launchPath,
    launchArgs: ['-Xdebug', `-Xrunjdwp:transport=dt_socket,address=${attachHost}:${attachPort},server=y,suspend=y`, '-classpath', launchPath, entryPointClass, ...(config.runArgs || [])]
  });
}

async function javaDebugWaitForJdwpProcessStart(jvmSuspendArgs) {
  return new Promise(resolve => {
    const disposable = new (_UniversalDisposable || _load_UniversalDisposable()).default();
    disposable.add(_rxjsBundlesRxMinJs.Observable.interval(1000).mergeMap(async () => {
      const line = await _findJdwpProcess(jvmSuspendArgs);
      if (line != null) {
        disposable.dispose();
        resolve();
      }
    }).timeout(30000).subscribe());
  });
}

async function javaDebugWaitForJdwpProcessExit(jvmSuspendArgs) {
  return new Promise(resolve => {
    const disposable = new (_UniversalDisposable || _load_UniversalDisposable()).default();
    let pidLine = null;
    disposable.add(_rxjsBundlesRxMinJs.Observable.interval(1000).mergeMap(async () => {
      const line = await _findJdwpProcess(jvmSuspendArgs);
      if (line != null) {
        if (pidLine != null && pidLine !== line) {
          // The matching target process line has changed, so the process
          // we were watching is now gone.
          disposable.dispose();
          resolve();
        }
        pidLine = line;
      } else {
        disposable.dispose();
        resolve();
      }
    }).subscribe());
  });
}

async function _getJavaArgs(debug) {
  const baseJavaArgs = ['-classpath', await _getClassPath(), 'com.facebook.nuclide.debugger.JavaDbg', '--vsp'];
  const debugArgs = debug ? ['-Xdebug', '-Xrunjdwp:transport=dt_socket,address=127.0.0.1:' + (await (0, (_serverPort || _load_serverPort()).getAvailableServerPort)()).toString() + ',server=y,suspend=n'] : [];
  return debugArgs.concat(baseJavaArgs);
}

async function _getClassPath() {
  const serverJarPath = (_nuclideUri || _load_nuclideUri()).default.join(__dirname, 'Build', 'java_debugger_server.jar');

  if (!(await (_fsPromise || _load_fsPromise()).default.exists(serverJarPath))) {
    throw new Error(`Could not locate the java debugger server jar: ${serverJarPath}. ` + 'Please check your Nuclide installation.');
  }

  // Determining JDK lib path varies by platform.
  let toolsJarPath;
  switch (_os.default.platform()) {
    case 'win32':
      toolsJarPath = (process.env.JAVA_HOME || '') + '\\lib\\tools.jar';

      break;
    case 'linux':
      {
        // Find java
        const java = (await (0, (_process || _load_process()).runCommand)('which', ['java']).toPromise()).trim();
        const javaHome = await (_fsPromise || _load_fsPromise()).default.realpath(java);

        const matches = /(.*)\/java/.exec(javaHome);
        toolsJarPath = matches.length > 1 ? matches[1] + '/../lib/tools.jar' : '';
        break;
      }
    case 'darwin':
    default:
      {
        const javaHome = (await (0, (_process || _load_process()).runCommand)('/usr/libexec/java_home').toPromise()).trim();
        toolsJarPath = javaHome + '/lib/tools.jar';

        break;
      }
  }
  if (!(await (_fsPromise || _load_fsPromise()).default.exists(toolsJarPath))) {
    throw new Error(`Could not locate required JDK tools jar: ${toolsJarPath}. Is the JDK installed?`);
  }
  return (_nuclideUri || _load_nuclideUri()).default.joinPathList([serverJarPath, toolsJarPath]);
}

async function _findJdwpProcess(jvmSuspendArgs) {
  const commands = await (0, (_process || _load_process()).runCommand)('ps', ['-eww', '-o', 'pid,args'], {}).toPromise();

  const procs = commands.toString().split('\n').filter(line => line.includes(jvmSuspendArgs));
  const line = procs.length === 1 ? procs[0] : null;
  return line;
}