"use strict";

function _createPackage() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons-atom/createPackage"));

  _createPackage = function () {
    return data;
  };

  return data;
}

function _textEditor() {
  const data = require("../../../modules/nuclide-commons-atom/text-editor");

  _textEditor = function () {
    return data;
  };

  return data;
}

function _event() {
  const data = require("../../../modules/nuclide-commons/event");

  _event = function () {
    return data;
  };

  return data;
}

function _nuclideRemoteConnection() {
  const data = require("../../nuclide-remote-connection");

  _nuclideRemoteConnection = function () {
    return data;
  };

  return data;
}

function _constants() {
  const data = require("./constants");

  _constants = function () {
    return data;
  };

  return data;
}

function _RemoteTextEditorPlaceholder() {
  const data = require("./RemoteTextEditorPlaceholder");

  _RemoteTextEditorPlaceholder = function () {
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

function _featureConfig() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons-atom/feature-config"));

  _featureConfig = function () {
    return data;
  };

  return data;
}

function _loadingNotification() {
  const data = _interopRequireDefault(require("../../commons-atom/loading-notification"));

  _loadingNotification = function () {
    return data;
  };

  return data;
}

var _atom = require("atom");

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
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

function _startConnectFlow() {
  const data = _interopRequireDefault(require("./startConnectFlow"));

  _startConnectFlow = function () {
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

function _promise() {
  const data = require("../../../modules/nuclide-commons/promise");

  _promise = function () {
    return data;
  };

  return data;
}

function _RemoteDirectorySearcher() {
  const data = _interopRequireDefault(require("./RemoteDirectorySearcher"));

  _RemoteDirectorySearcher = function () {
    return data;
  };

  return data;
}

function _RemoteDirectoryProvider() {
  const data = _interopRequireDefault(require("./RemoteDirectoryProvider"));

  _RemoteDirectoryProvider = function () {
    return data;
  };

  return data;
}

function _RemoteProjectsController() {
  const data = _interopRequireDefault(require("./RemoteProjectsController"));

  _RemoteProjectsController = function () {
    return data;
  };

  return data;
}

function _RemoteProjectsService() {
  const data = _interopRequireDefault(require("./RemoteProjectsService"));

  _RemoteProjectsService = function () {
    return data;
  };

  return data;
}

function _patchAtomWorkspaceReplace() {
  const data = _interopRequireDefault(require("./patchAtomWorkspaceReplace"));

  _patchAtomWorkspaceReplace = function () {
    return data;
  };

  return data;
}

function _AtomNotifications() {
  const data = require("./AtomNotifications");

  _AtomNotifications = function () {
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
 *  strict-local
 * @format
 */
const CLOSE_PROJECT_DELAY_MS = 100;

class Activation {
  constructor(state) {
    var _ref;

    this._subscriptions = new (_UniversalDisposable().default)();
    this._pendingFiles = {};
    this._controller = new (_RemoteProjectsController().default)();
    this._remoteProjectsService = new (_RemoteProjectsService().default)();

    this._openRemoteFile = (uri = '') => {
      if (!uri.startsWith('nuclide:') && !_nuclideUri().default.isInArchive(uri)) {
        return;
      }

      if (uri.startsWith('nuclide:')) {
        const serverConnection = _nuclideRemoteConnection().ServerConnection.getForUri(uri);

        if (serverConnection == null) {
          // It's possible that the URI opens before the remote connection has finished loading
          // (or the remote connection cannot be restored for some reason).
          //
          // In this case, we can just let Atom open a blank editor. Once the connection
          // is re-established, the `onDidAddRemoteConnection` logic above will restore the
          // editor contents as appropriate.
          return;
        } // Handle service provided fileOpeners


        const htmlElement = this._handleRemoteFileOpeners(serverConnection, uri);

        if (htmlElement != null) {
          return htmlElement;
        }

        const connection = _nuclideRemoteConnection().RemoteConnection.getForUri(uri); // On Atom restart, it tries to open the uri path as a file tab because it's not a local
        // directory. We can't let that create a file with the initial working directory path.


        if (connection != null && uri === connection.getUri()) {
          const blankEditor = atom.workspace.buildTextEditor({}); // No matter what we do here, Atom is going to create a blank editor.
          // We don't want the user to see this, so destroy it as soon as possible.

          setImmediate(() => blankEditor.destroy());
          return blankEditor;
        }
      }

      if (this._pendingFiles[uri]) {
        return this._pendingFiles[uri];
      }

      const textEditorPromise = createEditorForNuclide(uri);
      this._pendingFiles[uri] = textEditorPromise;

      const removeFromCache = () => delete this._pendingFiles[uri];

      textEditorPromise.then(removeFromCache, removeFromCache);
      return textEditorPromise;
    };

    this._subscriptions.add(_nuclideRemoteConnection().RemoteConnection.onDidAddRemoteConnection(connection => {
      this._subscriptions.add(addRemoteFolderToProject(connection));

      replaceRemoteEditorPlaceholders();
    }), (0, _event().observableFromSubscribeFunction)(atom.workspace.onDidAddPaneItem.bind(atom.workspace)).subscribe(replaceRemoteEditorPlaceholders));

    this._subscriptions.add(atom.commands.add('atom-workspace', 'nuclide-remote-projects:connect', event => {
      const {
        initialCwd,
        project
      } = event.detail || {};
      (0, _startConnectFlow().default)({
        initialCwd,
        project
      });
    }), atom.commands.add('atom-workspace', 'nuclide-remote-projects:kill-and-restart', () => shutdownServersAndRestartNuclide())); // Subscribe opener before restoring the remote projects.


    this._subscriptions.add(atom.workspace.addOpener(this._openRemoteFile));

    this._subscriptions.add(atom.workspace.observeTextEditors(editor => {
      const uri = editor.getURI();

      if (uri != null && _nuclideUri().default.isInArchive(uri)) {
        (0, _textEditor().enforceReadOnlyEditor)(editor);
      }
    }));

    this._subscriptions.add((0, _patchAtomWorkspaceReplace().default)()); // If RemoteDirectoryProvider is called before this, and it failed
    // to provide a RemoteDirectory for a
    // given URI, Atom will create a generic Directory to wrap that. We want
    // to delete these instead, because those directories aren't valid/useful
    // if they are not true RemoteDirectory objects (connected to a real
    // real remote folder).


    deleteDummyRemoteRootDirectories(); // Attempt to reload previously open projects.

    const remoteProjectsConfig = validateRemoteProjectConfig(typeof state === 'object' ? (_ref = state) != null ? _ref.remoteProjectsConfig : _ref : null);
    reloadRemoteProjects(remoteProjectsConfig, this._remoteProjectsService);
    this._remoteFileOpeners = [];
  }

  dispose() {
    this._subscriptions.dispose();

    this._controller.dispose();

    this._remoteProjectsService.dispose(); // Gracefully shutdown all server connections and leave servers running.


    const shutdown = false;
    const shutdownTimeout = 1000; // This tells Atom to wait for the close request to be acknowledged -
    // but don't wait too long.

    return Promise.race([_nuclideRemoteConnection().ServerConnection.closeAll(shutdown).catch(err => {
      // log4js is potentially also being shut down during deactivation.
      // eslint-disable-next-line no-console
      console.error('Error closing server connections in deactivate', err);
    }), (0, _promise().sleep)(shutdownTimeout)]);
  }

  serialize() {
    var _ref2;

    const currentProjectSpec = // $FlowIgnore: Add this to our types once we upstream
    atom.project.getSpecification == null ? null : atom.project.getSpecification();
    const projectFileUri = (_ref2 = currentProjectSpec) != null ? _ref2.originPath : _ref2;
    let remoteProjectSpecUris;

    if (projectFileUri != null && _nuclideUri().default.isRemote(projectFileUri)) {
      var _ref3;

      const projectSpecPaths = ((_ref3 = currentProjectSpec) != null ? _ref3.paths : _ref3) || [];
      remoteProjectSpecUris = new Set(projectSpecPaths.map(path => _nuclideUri().default.resolve(projectFileUri, path)));
    } else {
      remoteProjectSpecUris = new Set();
    } // Get the directories that aren't part of the project file. They were added by the user so we
    // want to restore those too.


    const remoteConnections = getRemoteRootDirectories().map(dir => _nuclideRemoteConnection().RemoteConnection.getForUri(dir.getPath())).filter(Boolean);
    const projectConnections = remoteConnections.filter(conn => remoteProjectSpecUris.has(conn.getUri()));
    const nonProjectConnections = remoteConnections.filter(conn => !projectConnections.includes(conn));
    const projectConfig = projectConnections.length === 0 ? null : projectConnections[0].getConfig();
    const activeProject = projectFileUri == null || projectConfig == null ? null : Object.assign({}, projectConfig, {
      host: _nuclideUri().default.getHostname(projectFileUri),
      path: _nuclideUri().default.getPath(projectFileUri)
    });
    const remoteProjectsConfig = [activeProject, ...nonProjectConnections.map(conn => createSerializableRemoteConnectionConfiguration(conn.getConfig()))].filter(Boolean);
    return {
      remoteProjectsConfig
    };
  }

  _handleRemoteFileOpeners(serverConnection, uri) {
    let remoteFile;
    let htmlElement;

    try {
      remoteFile = new (_nuclideRemoteConnection().RemoteFile)(serverConnection, uri);

      for (let i = 0; i < this._remoteFileOpeners.length; i++) {
        htmlElement = this._remoteFileOpeners[i](remoteFile);

        if (htmlElement != null) {
          break;
        }
      }
    } catch (error) {
      _constants().logger.warn(`Error opening file ${uri}`, error);
    } finally {
      if (remoteFile != null) {
        remoteFile.dispose();
      }
    }

    return htmlElement;
  } //
  // Services
  //


  getHomeFragments() {
    return {
      feature: {
        title: 'Remote Connection',
        icon: 'cloud-upload',
        description: 'Connect to a remote server to edit files.',
        command: 'nuclide-remote-projects:connect'
      },
      priority: 8
    };
  }

  provideRemoteProjectsService() {
    return this._remoteProjectsService;
  }

  provideRpcServices() {
    return Object.freeze({
      getServiceByNuclideUri: (serviceName, uri) => (0, _nuclideRemoteConnection().getServiceByNuclideUri)(serviceName, uri)
    });
  }

  createRemoteDirectorySearcher() {
    return new (_RemoteDirectorySearcher().default)(dir => {
      return (0, _nuclideRemoteConnection().getCodeSearchServiceByNuclideUri)(dir.getPath());
    }, () => this._workingSetsStore);
  }

  consumeStatusBar(statusBar) {
    this._controller.consumeStatusBar(statusBar);
  }

  consumeNotifications(raiseNativeNotification) {
    (0, _AtomNotifications().setNotificationService)(raiseNativeNotification);
  }

  consumeWorkingSetsStore(store) {
    this._workingSetsStore = store;
  }

  provideRemoteFileOpenerService() {
    return {
      register: opener => {
        this._remoteFileOpeners.push(opener);

        return new (_UniversalDisposable().default)(() => {
          const index = this._remoteFileOpeners.indexOf(opener);

          this._remoteFileOpeners.splice(index, 1);
        });
      }
    };
  } //
  // Deserializers
  //


  deserializeRemoteTextEditorPlaceholder(state) {
    return new (_RemoteTextEditorPlaceholder().RemoteTextEditorPlaceholder)(state);
  }

}

function createSerializableRemoteConnectionConfiguration(config) {
  return {
    host: config.host,
    path: config.path,
    displayTitle: config.displayTitle,
    promptReconnectOnFailure: config.promptReconnectOnFailure
  };
}

function addRemoteFolderToProject(connection) {
  const workingDirectoryUri = connection.getUri(); // If restoring state, then the project already exists with local directory and wrong repo
  // instances. Hence, we remove it here, if existing, and add the new path for which we added a
  // workspace opener handler.

  atom.project.removePath(workingDirectoryUri);
  atom.project.addPath(workingDirectoryUri);
  const subscription = atom.project.onDidChangePaths(paths => {
    if (paths.indexOf(workingDirectoryUri) !== -1) {
      return;
    } // The project was removed from the tree.


    _constants().logger.info(`Project ${workingDirectoryUri} removed from the tree`);

    subscription.dispose();

    if (connection.getConnection().hasSingleMountPoint()) {
      closeOpenFilesForRemoteProject(connection);
    } // Integration tests close the connection manually, so skip the rest.


    if (atom.inSpecMode()) {
      return;
    } // Delay closing the underlying socket connection until registered subscriptions have closed.
    // We should never depend on the order of registration of the `onDidChangePaths` event,
    // which also dispose consumed service's resources.


    setTimeout(closeRemoteConnection, CLOSE_PROJECT_DELAY_MS);
  });

  function closeRemoteConnection() {
    const closeConnection = shutdownIfLast => {
      _constants().logger.info('Closing remote connection.', {
        shutdownIfLast
      });

      connection.close(shutdownIfLast);
    };

    _constants().logger.info('Closing connection to remote project.');

    if (!connection.getConnection().hasSingleMountPoint()) {
      _constants().logger.info('Remaining remote projects using Nuclide Server - no prompt to shutdown');

      const shutdownIfLast = false;
      closeConnection(shutdownIfLast);
      return;
    }

    if (connection.alwaysShutdownIfLast()) {
      closeConnection(true);
      return;
    }

    const shutdownServerAfterDisconnection = _featureConfig().default.get('nuclide-remote-projects.shutdownServerAfterDisconnection');

    if (!(typeof shutdownServerAfterDisconnection === 'boolean')) {
      throw new Error("Invariant violation: \"typeof shutdownServerAfterDisconnection === 'boolean'\"");
    }

    _constants().logger.info({
      shutdownServerAfterDisconnection
    });

    closeConnection(shutdownServerAfterDisconnection);
  }

  return subscription;
}

function closeOpenFilesForRemoteProject(connection) {
  const openInstances = (0, _utils().getOpenFileEditorForRemoteProject)();

  for (const openInstance of openInstances) {
    const {
      uri,
      editor,
      pane
    } = openInstance; // It's possible to open files outside of the root of the connection.
    // Only clean up these files if we're the only connection left.

    if (connection.getConnection().hasSingleMountPoint() || _nuclideUri().default.contains(connection.getUri(), uri)) {
      pane.removeItem(editor);
      editor.destroy();
    }
  }
}

function getRemoteRootDirectories() {
  // TODO: Use nuclideUri instead.
  return atom.project.getDirectories().filter(directory => directory.getPath().startsWith('nuclide:'));
}
/**
 * Removes any Directory (not RemoteDirectory) objects that have Nuclide
 * remote URIs.
 */


function deleteDummyRemoteRootDirectories() {
  for (const directory of atom.project.getDirectories()) {
    if (_nuclideUri().default.isRemote(directory.getPath()) && !_nuclideRemoteConnection().RemoteDirectory.isRemoteDirectory(directory)) {
      atom.project.removePath(directory.getPath());
    }
  }
}
/**
 * The same TextEditor must be returned to prevent Atom from creating multiple tabs
 * for the same file, because Atom doesn't cache pending opener promises.
 */


async function createEditorForNuclide(uri) {
  try {
    let buffer;

    try {
      buffer = await (0, _loadingNotification().default)((0, _nuclideRemoteConnection().loadBufferForUri)(uri), `Opening \`${_nuclideUri().default.nuclideUriToDisplayString(uri)}\`...`, 1000
      /* delay */
      );
    } catch (err) {
      // Suppress ENOENT errors which occur if the file doesn't exist.
      // This is the same thing Atom does when opening a file (given a URI) that doesn't exist.
      if (err.code !== 'ENOENT') {
        throw err;
      } // If `loadBufferForURI` fails, then the buffer is removed from Atom's list of buffers.
      // `buffer.file` is marked as destroyed, making it useless. So we create
      // a new `buffer` and call `finishLoading` so that the `buffer` is marked
      // as `loaded` and the proper events are fired. The effect of all of this
      // is that files that don't exist remotely anymore are shown as empty
      // unsaved text editors.


      buffer = (0, _nuclideRemoteConnection().bufferForUri)(uri);
      buffer.finishLoading();
    } // When in "large file mode", syntax highlighting and line wrapping are
    // disabled (among other things). This makes large files more usable.
    // Atom does this for local files.
    // https://github.com/atom/atom/blob/v1.9.8/src/workspace.coffee#L547


    const largeFileMode = buffer.getText().length > 2 * 1024 * 1024; // 2MB

    const textEditor = atom.textEditors.build({
      buffer,
      largeFileMode,
      autoHeight: false
    }); // Add a custom serializer that deserializes to a placeholder TextEditor
    // that we have total control over. The usual Atom deserialization flow for editors
    // typically involves attempting to load the file from disk, which tends to throw.

    const textEditorSerialize = textEditor.serialize; // $FlowIgnore

    textEditor.serialize = function () {
      const path = textEditor.getPath(); // It's possible for an editor's path to become local (via Save As).

      if (path == null || !_nuclideUri().default.isRemote(path)) {
        return textEditorSerialize.call(textEditor);
      }

      const connection = _nuclideRemoteConnection().RemoteConnection.getForUri(path);

      let repositoryDescription;

      if (connection != null) {
        repositoryDescription = connection.getHgRepositoryDescription();
      }

      return {
        deserializer: 'RemoteTextEditorPlaceholder',
        data: {
          uri: path,
          contents: textEditor.getText(),
          // If the editor was unsaved, we'll restore the unsaved contents after load.
          isModified: textEditor.isModified(),
          repositoryDescription
        }
      };
    }; // Null out the buffer's serializer.
    // We don't need to waste time deserializing this (especially on Windows, where
    // attempting to read the path blocks Atom from loading)
    // As of Atom 1.22 null just gets filtered out by the project serializer.
    // https://github.com/atom/atom/blob/master/src/project.js#L117
    // $FlowIgnore


    const bufferSerialize = buffer.serialize; // $FlowIgnore

    buffer.serialize = function () {
      const path = buffer.getPath();

      if (path == null || !_nuclideUri().default.isRemote(path)) {
        return bufferSerialize.call(buffer);
      }

      return null;
    };

    return textEditor;
  } catch (err) {
    _constants().logger.warn('buffer load issue:', err);

    atom.notifications.addError(`Failed to open ${uri}: ${err.message}`);
    throw err;
  }
}

async function reloadRemoteProjects(remoteProjects, remoteProjectsService) {
  // This is intentionally serial.
  // The 90% use case is to have multiple remote projects for a single connection;
  const reloadedProjects = [];

  for (const config of remoteProjects) {
    // eslint-disable-next-line no-await-in-loop
    const connection = await remoteProjectsService.createRemoteConnection(config);

    if (!connection) {
      _constants().logger.info('No RemoteConnection returned on restore state trial:', config.host, config.path); // Atom restores remote files with a malformed URIs, which somewhat resemble local paths.
      // If after an unsuccessful connection user modifies and saves them he's presented
      // with a credential requesting dialog, as the file is attempted to be saved into
      // /nuclide:/<hostname> folder. If the user will approve the elevation and actually save
      // the file all kind of weird stuff happens (see t10842295) since the difference between the
      // remote and the valid local path becomes less aparent.
      // Anyway - these files better be closed.


      atom.workspace.getTextEditors().forEach(textEditor => {
        if (textEditor == null) {
          return;
        }

        const path = textEditor.getPath();

        if (path == null) {
          return;
        }

        if (path.startsWith(`nuclide:/${config.host}`)) {
          textEditor.destroy();
        }
      });

      _nuclideRemoteConnection().ServerConnection.cancelConnection(config.host);
    } else {
      reloadedProjects.push(connection.getUri());
    }
  }

  remoteProjectsService._reloadFinished(reloadedProjects);
}

function shutdownServersAndRestartNuclide() {
  atom.confirm({
    message: 'This will shutdown your Nuclide servers and restart Atom, ' + 'discarding all unsaved changes. Continue?',
    buttons: {
      'Shutdown && Restart': async () => {
        try {
          await (0, _nuclideAnalytics().trackImmediate)('nuclide-remote-projects:kill-and-restart');
        } finally {
          // This directly kills the servers without removing the RemoteConnections
          // so that restarting Nuclide preserves the existing workspace state.
          await _nuclideRemoteConnection().ServerConnection.forceShutdownAllServers();
          atom.reload();
        }
      },
      Cancel: () => {}
    }
  });
}

function replaceRemoteEditorPlaceholders() {
  // On Atom restart, it tries to open uri paths as local `TextEditor` pane items.
  // Here, Nuclide reloads the remote project files that have empty text editors open.
  const openInstances = (0, _utils().getOpenFileEditorForRemoteProject)(); // Get list of non null connections available currently

  const remoteConnections = getRemoteRootDirectories().map(dir => _nuclideRemoteConnection().RemoteConnection.getForUri(dir.getPath())).filter(Boolean);

  for (const openInstance of openInstances) {
    // Keep the original open editor item with a unique name until the remote buffer is loaded,
    // Then, we are ready to replace it with the remote tab in the same pane.
    const {
      pane,
      editor,
      filePath
    } = openInstance;
    let uri = openInstance.uri;

    let connection = _nuclideRemoteConnection().RemoteConnection.getForUri(uri);

    if (connection == null) {
      const migratedUri = migrateRemoteEditorToCurrentInstance(openInstance, remoteConnections);

      if (migratedUri == null) {
        continue;
      }

      connection = migratedUri.connection;
      uri = migratedUri.uri;
    }

    if (connection == null) {
      continue;
    }

    const config = connection.getConfig(); // Skip restoring the editor who has remote content loaded.

    if (editor instanceof _atom.TextEditor && editor.getBuffer().file instanceof _nuclideRemoteConnection().RemoteFile) {
      continue;
    } // Atom ensures that each pane only has one item per unique URI.
    // Null out the existing pane item's URI so we can insert the new one
    // without closing the pane.


    if (editor instanceof _atom.TextEditor) {
      editor.getURI = () => null;
    } // Cleanup the old pane item on successful opening or when no connection could be
    // established.


    const cleanupBuffer = () => {
      pane.removeItem(editor);
      editor.destroy();
    };

    if (filePath === config.path) {
      cleanupBuffer();
    } else {
      // If we clean up the buffer before the `openUriInPane` finishes,
      // the pane will be closed, because it could have no other items.
      // So we must clean up after.
      atom.workspace.openURIInPane(uri, pane).then(newEditor => {
        if (editor instanceof _RemoteTextEditorPlaceholder().RemoteTextEditorPlaceholder && editor.isModified()) {
          // If we had unsaved changes previously, restore them.
          newEditor.setText(editor.getText());
        }
      }).then(cleanupBuffer, cleanupBuffer);
    }
  }
}
/*
 * This function has a very specific use case, if I serialize an editor on a
 * remote instance and then want to reopen that serialized editor as is
 * but on a different remote instance. This function takes in the available
 * remote connections and filters out remote connections that aren't hosting the
 * same repo as the one the serialized editor is from. If there is only one server
 * that fits the criteria go ahead and open the remote file in that new instance.
 * If there are multiple servers available then there would ideally be a UI that
 * allowed users to choose any of the valid available servers but for now don't
 * enter this dangerous zone.
 */


function migrateRemoteEditorToCurrentInstance(openInstance, remoteConnections) {
  const {
    filePath,
    repositoryDescription: originalRepositoryDescription
  } = openInstance;
  const filteredRemoteConnections = remoteConnections.filter(remoteConnection => {
    const repositoryDescription = remoteConnection.getHgRepositoryDescription();
    return (repositoryDescription === null || repositoryDescription === void 0 ? void 0 : repositoryDescription.repoPath) === (originalRepositoryDescription === null || originalRepositoryDescription === void 0 ? void 0 : originalRepositoryDescription.repoPath);
  }); // If number of eligible connections that can render this file are more than 1
  // then don't bother.
  // TODO : Create UI which offers dropdown to select which server they want to
  // load it on.

  if (filteredRemoteConnections.length === 1) {
    const remoteConnection = filteredRemoteConnections[0];

    if (!(remoteConnection != null)) {
      throw new Error("Invariant violation: \"remoteConnection != null\"");
    }

    const config = remoteConnection.getConfig();
    return {
      uri: `nuclide://${config.host}${filePath}`,
      connection: remoteConnection
    };
  }

  return null;
}

function validateRemoteProjectConfig(raw) {
  if (raw == null || !Array.isArray(raw)) {
    return [];
  }

  return raw.map(config => {
    if (config == null || typeof config !== 'object') {
      return null;
    }

    const {
      host,
      path: path_,
      cwd,
      displayTitle,
      promptReconnectOnFailure
    } = config;
    const path = cwd == null ? path_ : cwd; // We renamed this. Make sure we check the old name.

    if (host == null || path == null || displayTitle == null) {
      return null;
    }

    const formatted = {
      host: String(host),
      path: String(path),
      displayTitle: String(displayTitle)
    };

    if (typeof promptReconnectOnFailure === 'boolean') {
      formatted.promptReconnectOnFailure = promptReconnectOnFailure;
    }

    return formatted;
  }).filter(Boolean);
}

(0, _createPackage().default)(module.exports, Activation); // The "atom.directory-provider" service is unique in that it's requested prior to package
// activation. Since the Activation class pattern guards against this, we need to special-case it.
// eslint-disable-next-line nuclide-internal/no-commonjs

module.exports.createRemoteDirectoryProvider = () => new (_RemoteDirectoryProvider().default)();