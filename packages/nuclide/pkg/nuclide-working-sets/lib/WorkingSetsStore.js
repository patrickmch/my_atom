"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WorkingSetsStore = void 0;

function _groupBy2() {
  const data = _interopRequireDefault(require("lodash/groupBy"));

  _groupBy2 = function () {
    return data;
  };

  return data;
}

var _atom = require("atom");

function _memoizeUntilChanged() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/memoizeUntilChanged"));

  _memoizeUntilChanged = function () {
    return data;
  };

  return data;
}

function _nuclideWorkingSetsCommon() {
  const data = require("../../nuclide-working-sets-common");

  _nuclideWorkingSetsCommon = function () {
    return data;
  };

  return data;
}

function _collection() {
  const data = require("../../../modules/nuclide-commons/collection");

  _collection = function () {
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
const NEW_WORKING_SET_EVENT = 'new-working-set';
const NEW_DEFINITIONS_EVENT = 'new-definitions';
const SAVE_DEFINITIONS_EVENT = 'save-definitions';

class WorkingSetsStore {
  constructor() {
    this._userDefinitions = [];
    this._projectDefinitions = [];
    this._groupByApplicability = (0, _memoizeUntilChanged().default)(groupByApplicability, definitions => ({
      definitions,
      // Atom just keeps modifying the same array so we need to make a copy here if we want to
      // compare to a later value.
      projectRoots: atom.project.getDirectories().slice()
    }), (a, b) => (0, _collection().arrayEqual)(a.definitions, b.definitions) && (0, _collection().arrayEqual)(a.projectRoots, b.projectRoots));
    this._emitter = new _atom.Emitter();
    this._current = new (_nuclideWorkingSetsCommon().WorkingSet)();
    this._prevApplicability = {
      applicable: [],
      notApplicable: []
    };
    this._lastSelected = []; // Don't recompute definitions unless one of the properties it's derived from changes.

    this.getDefinitions = (0, _memoizeUntilChanged().default)(this.getDefinitions, () => [this._userDefinitions, this._projectDefinitions]);
  }

  getCurrent() {
    return this._current;
  }

  getDefinitions() {
    return [...this._userDefinitions, ...this._projectDefinitions];
  }

  getApplicableDefinitions() {
    return this._groupByApplicability(this.getDefinitions()).applicable;
  }

  getNotApplicableDefinitions() {
    return this._groupByApplicability(this.getDefinitions()).notApplicable;
  }

  subscribeToCurrent(callback) {
    return this._emitter.on(NEW_WORKING_SET_EVENT, callback);
  }

  subscribeToDefinitions(callback) {
    return this._emitter.on(NEW_DEFINITIONS_EVENT, callback);
  }

  onSaveDefinitions(callback) {
    return this._emitter.on(SAVE_DEFINITIONS_EVENT, callback);
  }

  updateUserDefinitions(definitions) {
    if ((0, _collection().arrayEqual)(this._userDefinitions, definitions)) {
      return;
    }

    this._updateDefinitions([...this._projectDefinitions, ...definitions]);
  }

  updateProjectDefinitions(definitions) {
    if ((0, _collection().arrayEqual)(this._projectDefinitions, definitions)) {
      return;
    }

    this._updateDefinitions([...this._userDefinitions, ...definitions]);
  }

  updateApplicability() {
    const {
      applicable: prevApplicableDefinitions,
      notApplicable: prevNotApplicableDefinitions
    } = this._prevApplicability;

    const {
      applicable,
      notApplicable
    } = this._groupByApplicability(this.getDefinitions());

    if ((0, _collection().arrayEqual)(prevApplicableDefinitions, applicable) && (0, _collection().arrayEqual)(prevNotApplicableDefinitions, notApplicable)) {
      return;
    }

    this._prevApplicability = {
      applicable,
      notApplicable
    };
    const activeApplicable = applicable.filter(d => d.active);

    if (activeApplicable.length > 0) {
      this._lastSelected = activeApplicable.map(d => d.name);
    }

    this._emitter.emit(NEW_DEFINITIONS_EVENT, {
      applicable,
      notApplicable
    }); // Create a working set to reflect the combination of the active definitions.


    const combinedUris = [].concat(...activeApplicable.map(d => d.uris));
    const newWorkingSet = new (_nuclideWorkingSetsCommon().WorkingSet)(combinedUris);

    if (!this._current.equals(newWorkingSet)) {
      this._current = newWorkingSet;

      this._emitter.emit(NEW_WORKING_SET_EVENT, newWorkingSet);
    }
  }

  saveWorkingSet(name, workingSet) {
    this._updateDefinition(name, name, workingSet);
  }

  update(name, newName, workingSet) {
    this._updateDefinition(name, newName, workingSet);
  }

  activate(name) {
    this._activateDefinition(name,
    /* active */
    true);
  }

  deactivate(name) {
    this._activateDefinition(name,
    /* active */
    false);
  }

  deleteWorkingSet(name) {
    (0, _nuclideAnalytics().track)('working-sets-delete', {
      name
    });
    const definitions = this.getDefinitions().filter(d => d.name !== name || d.sourceType === 'project');

    this._updateDefinitions(definitions);
  }

  _updateDefinition(name, newName, workingSet) {
    const definitions = this.getDefinitions();
    let nameIndex = -1;
    definitions.forEach((d, i) => {
      if (d.name === name) {
        nameIndex = i;
      }
    }); // FIXME: We shouldn't be using `repositoryForDirectorySync()`. It's a bad internal API.
    // `atom.project.repositoryForDirectory()` is the "right" one but, unfortunately,
    // `WorkingSetsStore` is currently written to require this to be synchronous.

    const repos = atom.project.getDirectories().filter(dir => workingSet.containsDir(dir.getPath())).map(dir => repositoryForDirectorySync(dir)).filter(Boolean);
    const originURLs = (0, _collection().arrayUnique)(repos.map(repo => repo.getOriginURL()).filter(Boolean));
    let newDefinitions;

    if (nameIndex < 0) {
      (0, _nuclideAnalytics().track)('working-sets-create', {
        name,
        uris: workingSet.getUris().join(','),
        originURLs: originURLs.join(',')
      });
      newDefinitions = definitions.concat({
        name,
        uris: workingSet.getUris(),
        active: false,
        originURLs,
        sourceType: 'user'
      });
    } else {
      (0, _nuclideAnalytics().track)('working-sets-update', {
        oldName: name,
        name: newName,
        uris: workingSet.getUris().join(','),
        originURLs: originURLs.join(',')
      });
      const definition = definitions[nameIndex];
      newDefinitions = [].concat(definitions.slice(0, nameIndex), Object.assign({}, definition, {
        name: newName,
        uris: workingSet.getUris(),
        originURLs
      }), definitions.slice(nameIndex + 1));
    }

    this._updateDefinitions(newDefinitions);
  }

  _activateDefinition(name, active) {
    (0, _nuclideAnalytics().track)('working-sets-activate', {
      name,
      active: active.toString()
    });
    const definitions = this.getDefinitions();
    const newDefinitions = definitions.map(d => Object.assign({}, d, {
      active: d.name === name ? active : d.active
    }));

    this._updateDefinitions(newDefinitions);
  }

  deactivateAll() {
    const definitions = this.getDefinitions().map(d => {
      if (!isApplicable(d)) {
        return d;
      }

      return Object.assign({}, d, {
        active: false
      });
    });

    this._updateDefinitions(definitions);
  }

  toggleLastSelected() {
    (0, _nuclideAnalytics().track)('working-sets-toggle-last-selected');

    if (this.getApplicableDefinitions().some(d => d.active)) {
      this.deactivateAll();
    } else {
      const newDefinitions = this.getDefinitions().map(d => {
        return Object.assign({}, d, {
          active: d.active || this._lastSelected.indexOf(d.name) > -1
        });
      });

      this._updateDefinitions(newDefinitions);
    }
  } // Update the working set definitions. All updates should go through this method! In other words,
  // this should be the only place where `_userDefinitions` and `_projectDefinitions` are changed.


  _updateDefinitions(definitions) {
    const {
      userDefinitions,
      projectDefinitions
    } = (0, _groupBy2().default)(definitions, d => d.sourceType === 'project' ? 'projectDefinitions' : 'userDefinitions');
    this._projectDefinitions = projectDefinitions || [];
    this._userDefinitions = userDefinitions || [];

    this._emitter.emit(SAVE_DEFINITIONS_EVENT, this.getDefinitions());

    this.updateApplicability();
  }

}

exports.WorkingSetsStore = WorkingSetsStore;

function groupByApplicability(definitions) {
  const applicable = [];
  const notApplicable = [];
  definitions.forEach(def => {
    if (isApplicable(def)) {
      applicable.push(def);
    } else {
      notApplicable.push(def);
    }
  });
  return {
    applicable,
    notApplicable
  };
}

function isApplicable(definition) {
  const originURLs = definition.originURLs;

  if (originURLs != null) {
    const mountedOriginURLs = atom.project.getRepositories().filter(Boolean).map(repo => repo.getOriginURL());
    originURLs.forEach(originURL => {
      if (mountedOriginURLs.some(url => url === originURL)) {
        return true;
      }
    });
  }

  const workingSet = new (_nuclideWorkingSetsCommon().WorkingSet)(definition.uris);
  const dirs = atom.project.getDirectories().filter(dir => {
    // Apparently sometimes Atom supplies an invalid directory, or a directory with an
    // invalid paths. See https://github.com/facebook/nuclide/issues/416
    if (dir == null) {
      const logger = (0, _log4js().getLogger)('nuclide-working-sets');
      logger.warn('Received a null directory from Atom');
      return false;
    }

    try {
      _nuclideUri().default.parse(dir.getPath());

      return true;
    } catch (e) {
      const logger = (0, _log4js().getLogger)('nuclide-working-sets');
      logger.warn('Failed to parse path supplied by Atom', dir.getPath());
      return false;
    }
  });
  return dirs.some(dir => workingSet.containsDir(dir.getPath()));
}

function repositoryForDirectorySync(dir) {
  // $FlowIgnore: This is an internal API. We really shouldn't use it.
  for (const provider of atom.project.repositoryProviders) {
    const repo = provider.repositoryForDirectorySync(dir);

    if (repo != null) {
      return repo;
    }
  }

  return null;
}