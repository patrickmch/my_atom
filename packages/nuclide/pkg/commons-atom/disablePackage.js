'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.DisabledReason = undefined;exports.default =















































disablePackage;var _idx;function _load_idx() {return _idx = _interopRequireDefault(require('idx'));}var _featureConfig;function _load_featureConfig() {return _featureConfig = _interopRequireDefault(require('../../modules/nuclide-commons-atom/feature-config'));}var _UniversalDisposable;function _load_UniversalDisposable() {return _UniversalDisposable = _interopRequireDefault(require('../../modules/nuclide-commons/UniversalDisposable'));}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}const DisabledReason = exports.DisabledReason = Object.freeze({ INCOMPATIBLE: 'incompatible', REIMPLEMENTED: 'reimplemented' }); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       * Copyright (c) 2015-present, Facebook, Inc.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       * All rights reserved.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       * This source code is licensed under the license found in the LICENSE file in
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       * the root directory of this source tree.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       * 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       * @format
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       */function deactivateAndUnloadPackage(name, options) {if (atom.packages.initialPackagesActivated === true) {if (options.warn) {const packageName = (_featureConfig || _load_featureConfig()).default.getPackageName();atom.notifications.addWarning(`Incompatible Package: ${name}`, { description: getWarningMessage(name, packageName, options.reason), dismissable: true });}}const deactivationPromise = atom.packages.deactivatePackage(name) || Promise.resolve();deactivationPromise.then(() => {atom.packages.disablePackage(name);atom.packages.unloadPackage(name);}); // This is a horrible hack to work around the fact that preloaded packages can sometimes be loaded
  // twice. See also atom/atom#14837
  // $FlowIgnore
  delete atom.packages.preloadedPackages[name];}function disablePackage(name, options) {var _ref;const initiallyDisabled = atom.packages.isPackageDisabled(name);const reason = ((_ref = options) != null ? _ref.reason : _ref) || DisabledReason.INCOMPATIBLE;if (!initiallyDisabled) {// If it wasn't activated yet, maybe we can prevent the activation altogether
    atom.packages.disablePackage(name);}if (atom.packages.isPackageActive(name)) {deactivateAndUnloadPackage(name, { warn: false, reason });}

  const activationMonitor = atom.packages.onDidActivatePackage(pack => {
    if (pack.name === name) {
      deactivateAndUnloadPackage(name, { warn: true, reason });
    }
  });

  const stateRestorer = () => {
    // Re-enable Atom's bundled package to leave the user's environment the way
    // this package found it.
    if (!initiallyDisabled) {
      atom.packages.enablePackage(name);
    }
  };

  return new (_UniversalDisposable || _load_UniversalDisposable()).default(activationMonitor, stateRestorer);
}

function getWarningMessage(
disabledFeature,
packageName,
reason)
{
  switch (reason) {
    case 'incompatible':
      return (
        `${disabledFeature} can't be enabled because it's incompatible with ${packageName}.` +
        ` If you need to use this package, you must first disable ${packageName}.`);

    case 'reimplemented':
      return (
        `${disabledFeature} can't be enabled because it's incompatible with ${packageName},` +
        ` however ${packageName} provides similar functionality. If you need to use` +
        ` ${disabledFeature} anyway, you must first disable ${packageName}.`);

    default:
      reason;
      throw new Error(`Invalid reason: ${reason}`);}

}