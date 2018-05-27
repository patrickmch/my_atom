'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _asyncToGenerator = _interopRequireDefault(require('async-to-generator'));let getAdditionalLogFiles = (() => {var _ref = (0, _asyncToGenerator.default)(


































  function* (
  deadline)
  {
    const hostnames = (0, (_collection || _load_collection()).arrayUnique)(
    atom.project.
    getPaths().
    filter((_nuclideUri || _load_nuclideUri()).default.isRemote).
    map((_nuclideUri || _load_nuclideUri()).default.getHostname));


    return Promise.all(
    hostnames.
    map((() => {var _ref2 = (0, _asyncToGenerator.default)(function* (hostname) {
        const service = (0, (_nuclideRemoteConnection || _load_nuclideRemoteConnection()).getHhvmDebuggerServiceByNuclideUri)(
        (_nuclideUri || _load_nuclideUri()).default.createRemoteUri(hostname, '/'));

        if (service != null) {
          return {
            title: `HHVM Debugger log for ${hostname}`,
            data: yield service.createLogFilePaste() };

        }

        return {
          title: `HHVM Debugger log for ${hostname}`,
          data: '<service unavailable>' };

      });return function (_x2) {return _ref2.apply(this, arguments);};})()).
    filter(function (file) {return file != null;}));

  });return function getAdditionalLogFiles(_x) {return _ref.apply(this, arguments);};})();exports.getHomeFragments = getHomeFragments;exports.

createAdditionalLogFilesProvider = createAdditionalLogFilesProvider;var _nuclideUri;function _load_nuclideUri() {return _nuclideUri = _interopRequireDefault(require('../../../modules/nuclide-commons/nuclideUri'));}var _nuclideRemoteConnection;function _load_nuclideRemoteConnection() {return _nuclideRemoteConnection = require('../../nuclide-remote-connection');}var _collection;function _load_collection() {return _collection = require('../../../modules/nuclide-commons/collection');}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };} /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    * Copyright (c) 2015-present, Facebook, Inc.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    * All rights reserved.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    * This source code is licensed under the license found in the LICENSE file in
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    * the root directory of this source tree.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    *  strict-local
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    * @format
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    */function getHomeFragments() {return { feature: { title: 'Hack/PHP Debugger', icon: 'nuclicon-debugger', description: 'Connect to an HHVM server process and debug Hack/PHP code from within Nuclide.', command: 'debugger:show-attach-dialog' }, priority: 6 };}function createAdditionalLogFilesProvider() {return { id: 'hhvm-debugger', getAdditionalLogFiles };}