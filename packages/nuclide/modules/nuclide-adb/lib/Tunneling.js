"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startTunnelingAdb = startTunnelingAdb;
exports.stopTunnelingAdb = stopTunnelingAdb;
exports.isAdbTunneled = isAdbTunneled;
exports.VERSION_MISMATCH_ERROR = exports.MISSING_ADB_ERROR = void 0;

var _electron = require("electron");

function _log4js() {
  const data = require("log4js");

  _log4js = function () {
    return data;
  };

  return data;
}

function _SimpleCache() {
  const data = require("../../nuclide-commons/SimpleCache");

  _SimpleCache = function () {
    return data;
  };

  return data;
}

function _nuclideUri() {
  const data = _interopRequireDefault(require("../../nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _consumeFirstProvider() {
  const data = _interopRequireDefault(require("../../nuclide-commons-atom/consumeFirstProvider"));

  _consumeFirstProvider = function () {
    return data;
  };

  return data;
}

function _utils() {
  const data = require("./utils");

  _utils = function () {
    return data;
  };

  return data;
}

function _analytics() {
  const data = require("../../nuclide-commons/analytics");

  _analytics = function () {
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
 *  strict-local
 * @format
 */
let passesGK = async _ => false;

try {
  const fbPassesGK = // eslint-disable-next-line nuclide-internal/modules-dependencies
  require("../../nuclide-commons/passesGK");

  passesGK = fbPassesGK.default;
} catch (e) {}

const MISSING_ADB_ERROR = 'MissingAdbError';
exports.MISSING_ADB_ERROR = MISSING_ADB_ERROR;
const VERSION_MISMATCH_ERROR = 'VersionMismatchError'; // 1. Starts adb tunneling immediately (does not care if you subscribe)
// 2. Tunneling stays turned on even after you unsubscribe (to prevent too much on/off toggling)
// 3. Sends a value when everything is ready (if already active, it sends 'ready' immediately)
// 4. Guarantees that tunneling is active as long as the observable is not complete (or errored)

exports.VERSION_MISMATCH_ERROR = VERSION_MISMATCH_ERROR;

function startTunnelingAdb(uri, options = {}) {
  if (!_nuclideUri().default.isRemote(uri)) {
    return _rxjsCompatUmdMin.Observable.of('ready').concat(_rxjsCompatUmdMin.Observable.never());
  }

  const {
    tunnels
  } = activeTunnels.getOrCreate(uri, (_, serviceUri) => {
    if (!(typeof serviceUri === 'string')) {
      throw new Error("Invariant violation: \"typeof serviceUri === 'string'\"");
    }

    const adbService = (0, _utils().getAdbServiceByNuclideUri)(serviceUri);
    const localAdbService = (0, _utils().getAdbServiceByNuclideUri)('');

    const observable = _rxjsCompatUmdMin.Observable.defer(async () => {
      try {
        const [adbVersion, localAdbVersion] = await Promise.all([adbService.getVersion().catch(e => {
          e.host = serviceUri;
          throw e;
        }), localAdbService.getVersion().catch(e => {
          e.host = '';
          throw e;
        })]);

        if (adbVersion !== localAdbVersion) {
          const versionMismatchError = new Error(`Your remote adb version differs from the local one: ${adbVersion} (remote) != ${localAdbVersion} (local)`);
          versionMismatchError.name = VERSION_MISMATCH_ERROR;
          throw versionMismatchError;
        }
      } catch (e) {
        if (e.code === 'ENOENT' && e.host != null) {
          const missingAdbError = new Error(`'adb' not found in ${e.host === '' ? 'local' : 'remote'} $PATH.`);
          missingAdbError.name = MISSING_ADB_ERROR;
          throw missingAdbError;
        } else {
          throw e;
        }
      }

      return adbService.checkMuxStatus();
    }).switchMap(useAdbmux => useAdbmux ? checkInToAdbmux(serviceUri) : openTunnelsManually(serviceUri)).publishReplay(1);

    let adbmuxPort;
    const subscription = observable.subscribe({
      next: port => adbmuxPort = port,
      error: e => {
        (0, _log4js().getLogger)('nuclide-adb:tunneling').error(e);
        (0, _analytics().track)('nuclide-adb:tunneling:error', {
          host: uri,
          error: e
        });

        if (e.name === MISSING_ADB_ERROR) {
          return;
        }

        let detail;
        const buttons = [];

        if (e.name === VERSION_MISMATCH_ERROR) {
          detail = e.message;
          const {
            adbUpgradeLink
          } = options;

          if (e.name === VERSION_MISMATCH_ERROR && adbUpgradeLink != null) {
            buttons.push({
              text: 'View upgrade instructions',
              onDidClick: () => _electron.shell.openExternal(adbUpgradeLink)
            });
          }
        } else {
          detail = "Your local devices won't be available on this host." + (e.name != null && e.name !== 'Error' ? `\n \n${e.name}` : '');
        }

        atom.notifications.addError('Failed to tunnel Android devices', {
          dismissable: true,
          detail,
          buttons
        });
      }
    }).add(() => {
      if (adbmuxPort != null) {
        adbService.checkOutMuxPort(adbmuxPort);
        adbmuxPort = null;
      }

      stopTunnelingAdb(uri);
    }) // Start everything!
    .add(observable.connect());
    return {
      subscription,
      tunnels: observable
    };
  });
  changes.next();
  return tunnels.mapTo('ready');
}

function stopTunnelingAdb(uri) {
  activeTunnels.delete(uri);
  changes.next();
}

function isAdbTunneled(uri) {
  return changes.startWith(undefined).map(() => activeTunnels.get(uri) != null).distinctUntilChanged();
}

const activeTunnels = new (_SimpleCache().SimpleCache)({
  keyFactory: uri => _nuclideUri().default.createRemoteUri(_nuclideUri().default.getHostname(uri), '/'),
  dispose: value => value.subscription.unsubscribe()
});
const changes = new _rxjsCompatUmdMin.Subject();

function checkInToAdbmux(host) {
  return _rxjsCompatUmdMin.Observable.defer(async () => {
    const getService = (0, _consumeFirstProvider().default)('nuclide.ssh-tunnel');
    const [service, avoidPrecreatingExopackageTunnel] = await Promise.all([getService, passesGK('nuclide_adb_exopackage_tunnel')]);

    if (!service) {
      throw new Error("Invariant violation: \"service\"");
    }

    return {
      service,
      avoidPrecreatingExopackageTunnel
    };
  }).switchMap(({
    service,
    avoidPrecreatingExopackageTunnel
  }) => {
    const tunnels = [{
      description: 'adbmux',
      from: {
        host,
        port: 'any_available',
        family: 4
      },
      to: {
        host: 'localhost',
        port: 5037,
        family: 4
      }
    }];

    if (!avoidPrecreatingExopackageTunnel) {
      tunnels.push({
        description: 'exopackage',
        from: {
          host,
          port: 2829,
          family: 4
        },
        to: {
          host: 'localhost',
          port: 2829,
          family: 4
        }
      });
    }

    return service.openTunnels(tunnels).map(resolved => resolved[0].from.port);
  }).switchMap(async port => {
    const service = (0, _utils().getAdbServiceByNuclideUri)(host);
    await service.checkInMuxPort(port);
    return port;
  });
}

function openTunnelsManually(host) {
  let retries = 3;
  return _rxjsCompatUmdMin.Observable.defer(async () => {
    await (0, _utils().getAdbServiceByNuclideUri)(host).killServer();
    const service = await (0, _consumeFirstProvider().default)('nuclide.ssh-tunnel');

    if (!service) {
      throw new Error("Invariant violation: \"service\"");
    }

    return service;
  }).timeout(5000).switchMap(service => service.openTunnels([{
    description: 'adb',
    from: {
      host,
      port: 5037,
      family: 4
    },
    to: {
      host: 'localhost',
      port: 5037,
      family: 4
    }
  }, {
    description: 'emulator console',
    from: {
      host,
      port: 5554,
      family: 4
    },
    to: {
      host: 'localhost',
      port: 5554,
      family: 4
    }
  }, {
    description: 'emulator adb',
    from: {
      host,
      port: 5555,
      family: 4
    },
    to: {
      host: 'localhost',
      port: 5555,
      family: 4
    }
  }, {
    description: 'exopackage',
    from: {
      host,
      port: 2829,
      family: 4
    },
    to: {
      host: 'localhost',
      port: 2829,
      family: 4
    }
  }])).retryWhen(errors => {
    return errors.do(error => {
      if (retries-- <= 0) {
        throw error;
      }
    });
  }).mapTo(null);
}