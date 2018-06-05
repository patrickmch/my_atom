'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.launchAndroidServiceOrActivityAndGetPid = launchAndroidServiceOrActivityAndGetPid;
exports.getAdbAttachPortTargetInfo = getAdbAttachPortTargetInfo;
exports.createJavaVspProcessInfo = createJavaVspProcessInfo;
exports.createJavaVspIProcessConfig = createJavaVspIProcessConfig;

var _nuclideDebuggerCommon;

function _load_nuclideDebuggerCommon() {
  return _nuclideDebuggerCommon = require('../nuclide-debugger-common');
}

var _utils;

function _load_utils() {
  return _utils = require('../atom-ide-debugger-java/utils');
}

var _UniversalDisposable;

function _load_UniversalDisposable() {
  return _UniversalDisposable = _interopRequireDefault(require('../nuclide-commons/UniversalDisposable'));
}

var _rxjsBundlesRxMinJs = require('rxjs/bundles/Rx.min.js');

var _consumeFirstProvider;

function _load_consumeFirstProvider() {
  return _consumeFirstProvider = _interopRequireDefault(require('../nuclide-commons-atom/consumeFirstProvider'));
}

var _nuclideUri;

function _load_nuclideUri() {
  return _nuclideUri = _interopRequireDefault(require('../nuclide-commons/nuclideUri'));
}

var _nuclideAdb;

function _load_nuclideAdb() {
  return _nuclideAdb = require('../nuclide-adb');
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Only one AdbProcessInfo can be active at a time. Since it ties up a forwarded
// adb port, new instances need to wait for the previous one to clean up before
// they can begin debugging.
let cleanupSubject = null; /**
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

const DEBUG_JAVA_DEBUGGER = false;

async function launchAndroidServiceOrActivityAndGetPid(providedPid, adbServiceUri, service, activity, action, device, packageName) {
  let attach = true;
  let pid = providedPid;
  const adbService = (0, (_nuclideAdb || _load_nuclideAdb()).getAdbServiceByNuclideUri)(adbServiceUri);
  if (service != null) {
    attach = false;
    await adbService.launchService(device, packageName, service || '', true);
  } else if (activity != null && action != null) {
    // First query the device to be sure the activity exists in the specified package.
    // This will allow us to bubble up a useful error message instead of a cryptic
    // adb failure if the user simply mistyped the activity or package name.
    const activityExists = await adbService.activityExists(device, packageName, activity || '');

    if (!activityExists) {
      const packages = await adbService.getAllAvailablePackages(device);
      const availableActivities = new Set(packages.filter(line => line.includes(packageName + '/')));
      atom.notifications.addError(`Activity ${activity || ''} does not exist in package ` + packageName + '\n' + 'Did you mean one of these activities: ' + '\n' + Array.from(availableActivities).map(activityLine => activityLine.split('/')[1]).join('\n'));
    }

    attach = false;
    await adbService.launchActivity(device, packageName, activity || '', true, action);
  }

  if (pid == null) {
    pid = await adbService.getPidFromPackageName(device, packageName);
    if (!Number.isInteger(pid)) {
      throw Error(`Fail to get pid for package: ${packageName}`);
    }
  }

  return {
    pid,
    attach
  };
}

async function getAdbAttachPortTargetInfo(device, adbServiceUri, targetUri, pid, subscriptions) {
  const tunnelRequired = (_nuclideUri || _load_nuclideUri()).default.isLocal(adbServiceUri) && (_nuclideUri || _load_nuclideUri()).default.isRemote(targetUri);
  const adbService = (0, (_nuclideAdb || _load_nuclideAdb()).getAdbServiceByNuclideUri)(adbServiceUri);
  let tunnelService;
  let adbPort;
  if (tunnelRequired) {
    tunnelService = await (0, (_consumeFirstProvider || _load_consumeFirstProvider()).default)('nuclide.ssh-tunnel');
    adbPort = await tunnelService.getAvailableServerPort(adbServiceUri);
  } else {
    tunnelService = null;
    const service = (0, (_utils || _load_utils()).getJavaDebuggerHelpersServiceByNuclideUri)(adbServiceUri);
    adbPort = await service.getPortForJavaDebugger();
  }

  const forwardSpec = await adbService.forwardJdwpPortToPid(device, adbPort, pid || 0);

  if (cleanupSubject != null) {
    await cleanupSubject.toPromise();
  }

  cleanupSubject = new _rxjsBundlesRxMinJs.Subject();
  subscriptions.add(async () => {
    const result = await adbService.removeJdwpForwardSpec(device, forwardSpec);
    if (result.trim().startsWith('error')) {
      // TODO(Ericblue): The OneWorld proxy swaps TCP forward for a local filesystem
      // redirection, which confuses adb and prevents proper removal of
      // the forward spec.  Fall back to removing all specs to avoid leaking
      // the port.
      await adbService.removeJdwpForwardSpec(device, null);
    }

    if (cleanupSubject != null) {
      cleanupSubject.complete();
    }
  });

  const attachPort = await new Promise(async (resolve, reject) => {
    try {
      if (!tunnelRequired) {
        resolve(adbPort);
        return;
      }

      if (!tunnelService) {
        throw new Error('Invariant violation: "tunnelService"');
      }

      const debuggerPort = await tunnelService.getAvailableServerPort(targetUri);
      const tunnel = {
        description: 'Java debugger',
        from: {
          host: (_nuclideUri || _load_nuclideUri()).default.getHostname(targetUri),
          port: debuggerPort,
          family: 4
        },
        to: { host: 'localhost', port: adbPort, family: 4 }
      };
      const openTunnel = tunnelService.openTunnels([tunnel]).share();
      subscriptions.add(openTunnel.subscribe());
      await openTunnel.take(1).toPromise();
      resolve(debuggerPort);
    } catch (e) {
      reject(e);
    }
  });
  return {
    debugMode: 'attach',
    machineName: 'localhost',
    port: attachPort
  };
}

async function createJavaVspProcessInfo(targetUri, config, clickEvents) {
  const processConfig = await createJavaVspIProcessConfig(targetUri, config, clickEvents);
  const info = new (_nuclideDebuggerCommon || _load_nuclideDebuggerCommon()).VspProcessInfo(processConfig.targetUri, processConfig.debugMode, processConfig.adapterType, processConfig.adapterExecutable, processConfig.config, { threads: true }, {
    customControlButtons: (0, (_utils || _load_utils()).getCustomControlButtonsForJavaSourcePaths)(clickEvents),
    threadsComponentTitle: 'Threads'
  });

  const subscriptions = new (_UniversalDisposable || _load_UniversalDisposable()).default();
  subscriptions.add(...(0, (_utils || _load_utils()).getSourcePathClickSubscriptionsOnVspInstance)(targetUri, info, clickEvents));
  info.addCustomDisposable(subscriptions);
  return info;
}

async function getJavaVSAdapterExecutableInfo(targetUri) {
  return (0, (_utils || _load_utils()).getJavaDebuggerHelpersServiceByNuclideUri)(targetUri).getJavaVSAdapterExecutableInfo(DEBUG_JAVA_DEBUGGER);
}

async function createJavaVspIProcessConfig(targetUri, config, clickEvents) {
  const adapterExecutable = await getJavaVSAdapterExecutableInfo(targetUri);
  // If you have built using debug information, then print the debug server port:
  if (DEBUG_JAVA_DEBUGGER) {
    try {
      const port = adapterExecutable.args[1].split(':')[2].split(',')[0];
      /* eslint-disable no-console */
      console.log('Java Debugger Debug Port:', port);
    } catch (error) {
      /* eslint-disable no-console */
      console.log('Could not find debug server port from adapter executable', adapterExecutable);
    }
  }

  return {
    targetUri,
    debugMode: config.debugMode,
    adapterType: (_nuclideDebuggerCommon || _load_nuclideDebuggerCommon()).VsAdapterTypes.JAVA,
    adapterExecutable,
    config,
    capabilities: { threads: true },
    properties: {
      customControlButtons: (0, (_utils || _load_utils()).getCustomControlButtonsForJavaSourcePaths)(clickEvents),
      threadsComponentTitle: 'Threads'
    }
  };
}