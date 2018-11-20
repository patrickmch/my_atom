"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

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

/**
 * A wrapper over the specified Atom's config functions.
 * Each individual loaded package's config is a subconfig of the root package.
 */
class ConfigManager {
  constructor(config) {
    this._config = config;
  }

  getConfig() {
    return this._config;
  }
  /**
   * Sets the root package name.
   * This gets automatically called from FeatureLoader.
   */


  setPackageName(name) {
    this._packageName = name;
  }

  getPackageName() {
    if (!(this._packageName != null)) {
      throw new Error('No package name available');
    }

    return this._packageName;
  }

  formatKeyPath(keyPath) {
    if (this._packageName == null) {
      return keyPath;
    }

    return `${this._packageName}.${keyPath}`;
  }
  /*
   * Returns the value of a setting for a Nuclide feature key. Takes and returns the same types as
   * `atom.config.get` except `keyPath` is not optional. To get the entire config object, use
   * `atom.config.get`.
   *
   * Note: This is intentionally typed as mixed, this way each call site has to
   * first cast it as any and it is obvious that this is an area that is not safe
   * and flow will not proceed if the callsite doesn't do it.
   *
   * Example:
   *   const config: MyConfigType = (featureConfig.get('config-name'): any);
   */


  get(keyPath, options) {
    // atom.config.get will crash if the second arg is present and undefined.
    // It does not crash if the second arg is missing.
    return this._config.get(this.formatKeyPath(keyPath), ...(options == null ? [] : [options]));
  }

  getWithDefaults(keyPath, defaults, options) {
    const current = this.get(keyPath, options);
    return current == null ? defaults : current;
  }
  /*
   * Gets the schema of a setting for a Nuclide feature key. Takes and returns the same types as
   * `atom.config.getSchema`.
   */


  getSchema(keyPath) {
    return this._config.getSchema(this.formatKeyPath(keyPath));
  }
  /*
   * Similar to `atom.config.observe` except arguments are required, and options cannot be given.
   *
   * To observe changes on the entire config, use `atom.config.observe`.
   */


  observe(keyPath, optionsOrCallback, callback) {
    return this._config.observe(this.formatKeyPath(keyPath), ...Array.prototype.slice.call(arguments, 1));
  }
  /*
   * Behaves similarly to the `observe` function, but returns a stream of values, rather
   * than receiving a callback.
   */


  observeAsStream(keyPath, options = {}) {
    return _rxjsCompatUmdMin.Observable.create(observer => {
      const disposable = this.observe(keyPath, options, observer.next.bind(observer));
      return disposable.dispose.bind(disposable);
    });
  }
  /*
   * Takes and returns the same types as `atom.config.onDidChange` except `keyPath` is not optional.
   * To listen to changes on all key paths, use `atom.config.onDidChange`.
   */


  onDidChange(keyPath, optionsOrCallback, callback) {
    return this._config.onDidChange(this.formatKeyPath(keyPath), ...Array.prototype.slice.call(arguments, 1));
  }
  /*
   * Sets the value of a setting for a Nuclide feature key. Takes and returns the same types as
   * `atom.config.set`.
   */


  set(keyPath, value, options) {
    return this._config.set(this.formatKeyPath(keyPath), ...Array.prototype.slice.call(arguments, 1));
  }
  /*
   * Sets the schema of a setting for a Nuclide feature key. Takes and returns the same types as
   * `atom.config.setSchema`.
   */


  setSchema(keyPath, schema) {
    return this._config.setSchema(this.formatKeyPath(keyPath), ...Array.prototype.slice.call(arguments, 1));
  }
  /*
   * Restores a setting for a Nuclide feature key to its default value. Takes and returns the same
   * types as `atom.config.set`.
   */


  unset(keyPath, options) {
    return this._config.unset(this.formatKeyPath(keyPath), ...Array.prototype.slice.call(arguments, 1));
  }
  /**
   * Returns `true` if the feature with the given name is disabled either directly or because the
   * container package itself is disabled.
   */


  isFeatureDisabled(name) {
    if (this._packageName == null) {
      return atom.packages.isPackageDisabled(name);
    }

    return atom.packages.isPackageDisabled(this._packageName) || // $FlowFixMe flow doesn't register this._packageName as non-null here
    !this._config.get(`${this._packageName}.use.${name}`);
  }

}

exports.default = ConfigManager;