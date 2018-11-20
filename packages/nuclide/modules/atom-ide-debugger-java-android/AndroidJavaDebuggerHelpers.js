"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.launchAndroidServiceOrActivity = launchAndroidServiceOrActivity;
exports.getPidFromPackageName = getPidFromPackageName;
exports.getAdbAttachPortTargetInfo = getAdbAttachPortTargetInfo;

function _nullthrows() {
  const data = _interopRequireDefault(require("nullthrows"));

  _nullthrows = function () {
    return data;
  };

  return data;
}

function _analytics() {
  const data = require("../nuclide-commons/analytics");

  _analytics = function () {
    return data;
  };

  return data;
}

function _promise() {
  const data = require("../nuclide-commons/promise");

  _promise = function () {
    return data;
  };

  return data;
}

function _utils() {
  const data = require("../atom-ide-debugger-java/utils");

  _utils = function () {
    return data;
  };

  return data;
}

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _consumeFirstProvider() {
  const data = _interopRequireDefault(require("../nuclide-commons-atom/consumeFirstProvider"));

  _consumeFirstProvider = function () {
    return data;
  };

  return data;
}

function _nuclideUri() {
  const data = _interopRequireDefault(require("../nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
    return data;
  };

  return data;
}

function _nuclideAdb() {
  const data = require("../nuclide-adb");

  _nuclideAdb = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
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
// eslint-disable-next-line nuclide-internal/modules-dependencies
// Only one AdbProcessInfo can be active at a time. Since it ties up a forwarded
// adb port, new instances need to wait for the previous one to clean up before
let cleanupSubject = null;

async function launchAndroidServiceOrActivity(adbServiceUri, service, activity, action, deviceSerial, packageName) {
  const adbService = (0, _nuclideAdb().getAdbServiceByNuclideUri)(adbServiceUri);

  if (service != null) {
    await adbService.launchService(deviceSerial, packageName, service || '', true);
  } else if (activity != null && action != null) {
    // First query the device to be sure the activity exists in the specified package.
    // This will allow us to bubble up a useful error message instead of a cryptic
    // adb failure if the user simply mistyped the activity or package name.
    const activityExists = await adbService.activityExists(deviceSerial, packageName, activity || '');

    if (!activityExists) {
      const packages = await adbService.getAllAvailablePackages(deviceSerial);
      const availableActivities = new Set(packages.filter(line => line.includes(packageName + '/')));
      atom.notifications.addError(`Activity ${activity || ''} does not exist in package ` + packageName + '\n' + 'Did you mean one of these activities: ' + '\n' + Array.from(availableActivities).map(activityLine => activityLine.split('/')[1]).join('\n'));
    }

    await adbService.launchActivity(deviceSerial, packageName, activity || '', true, action);
  }
}

async function getPidFromPackageName(adbServiceUri, deviceSerial, packageName) {
  const adbService = (0, _nuclideAdb().getAdbServiceByNuclideUri)(adbServiceUri);
  let pid = await adbService.getPidFromPackageName(deviceSerial, packageName);
  const firstTryFails = !Number.isInteger(pid);

  if (firstTryFails) {
    // Try twice after a short delay because sometimes it works.
    await (0, _promise().sleep)(300);
    pid = await adbService.getPidFromPackageName(deviceSerial, packageName);
  }

  const success = Number.isInteger(pid);
  (0, _analytics().track)('atom-ide-debugger-java-android-getPidFromPackageName', {
    triedTwice: firstTryFails,
    success,
    pid
  });

  if (success) {
    return pid;
  } else {
    throw new Error(`Fail to get pid for package: ${packageName}. Instead got: ${pid}`);
  }
}

async function getAdbAttachPortTargetInfo(deviceSerial, adbServiceUri, targetUri, pid, subscriptions, packageName) {
  const tunnelRequired = _nuclideUri().default.isLocal(adbServiceUri) && _nuclideUri().default.isRemote(targetUri);

  const tunnelService = tunnelRequired ? await (0, _consumeFirstProvider().default)('nuclide.ssh-tunnel') : null;
  const adbService = (0, _nuclideAdb().getAdbServiceByNuclideUri)(adbServiceUri); // tunnel Service's getAvailableServerPort does something weird where it
  //   wants adbServiceUri to be either '' or 'localhost'

  const adbPort = tunnelRequired ? await (0, _nullthrows().default)(tunnelService).getAvailableServerPort(_nuclideUri().default.isLocal(adbServiceUri) ? 'localhost' : adbServiceUri) : await (0, _utils().getJavaDebuggerHelpersServiceByNuclideUri)(adbServiceUri).getPortForJavaDebugger();
  const forwardSpec = await adbService.forwardJdwpPortToPid(deviceSerial, adbPort, pid || 0);

  if (cleanupSubject != null) {
    await cleanupSubject.toPromise();
  }

  cleanupSubject = new _rxjsCompatUmdMin.Subject();
  subscriptions.add(async () => {
    const result = await adbService.removeJdwpForwardSpec(deviceSerial, forwardSpec);

    if (result.trim().startsWith('error')) {
      // TODO(Ericblue): The OneWorld proxy swaps TCP forward for a local filesystem
      // redirection, which confuses adb and prevents proper removal of
      // the forward spec.  Fall back to removing all specs to avoid leaking
      // the port.
      await adbService.removeJdwpForwardSpec(deviceSerial, null);
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
        throw new Error("Invariant violation: \"tunnelService\"");
      }

      const tunnel = {
        description: 'Java debugger',
        from: {
          host: _nuclideUri().default.getHostname(targetUri),
          port: 'any_available',
          family: 4
        },
        to: {
          host: 'localhost',
          port: adbPort,
          family: 4
        }
      };
      const openTunnel = tunnelService.openTunnels([tunnel]).share();
      subscriptions.add(openTunnel.subscribe());
      const tunnels = await openTunnel.take(1).toPromise();
      resolve(tunnels[0].from.port);
    } catch (e) {
      reject(e);
    }
  });
  return {
    debugMode: 'attach',
    machineName: 'localhost',
    port: attachPort,
    packageName,
    deviceSerial
  };
}