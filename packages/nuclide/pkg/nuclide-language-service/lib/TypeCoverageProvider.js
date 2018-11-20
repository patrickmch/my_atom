"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TypeCoverageProvider = void 0;

function _nuclideRemoteConnection() {
  const data = require("../../nuclide-remote-connection");

  _nuclideRemoteConnection = function () {
    return data;
  };

  return data;
}

function _nuclideAnalytics() {
  const data = require("../../../modules/nuclide-analytics");

  _nuclideAnalytics = function () {
    return data;
  };

  return data;
}

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 *  strict-local
 * @format
 */
// Provides Diagnostics for un-typed regions of Hack code.
class TypeCoverageProvider {
  constructor(name, grammarScopes, priority, analyticsEventName, icon, connectionToLanguageService) {
    this.displayName = name;
    this.priority = priority;
    this.grammarScopes = grammarScopes;
    this.icon = icon;
    this._analyticsEventName = analyticsEventName;
    this._connectionToLanguageService = connectionToLanguageService;
    this._onToggleValue = false; // eslint-disable-next-line nuclide-internal/unused-subscription

    this._connectionToLanguageService.observeValues().subscribe(async languageService => {
      const ls = await languageService;
      ls.onToggleCoverage(this._onToggleValue);
    });
  }

  static register(name, grammarScopes, config, connectionToLanguageService) {
    return atom.packages.serviceHub.provide('nuclide-type-coverage', config.version, new TypeCoverageProvider(name, grammarScopes, config.priority, config.analyticsEventName, config.icon, connectionToLanguageService));
  }

  async getCoverage(path) {
    return (0, _nuclideAnalytics().trackTiming)(this._analyticsEventName, async () => {
      const languageService = this._connectionToLanguageService.getForUri(path);

      if (languageService == null) {
        return null;
      }

      return (await languageService).getCoverage(path);
    });
  }

  async onToggle(on) {
    this._onToggleValue = on;
    await Promise.all(Array.from(this._connectionToLanguageService.values()).map(async languageService => {
      const ls = await languageService;
      ls.onToggleCoverage(on);
    }));
  }

}

exports.TypeCoverageProvider = TypeCoverageProvider;