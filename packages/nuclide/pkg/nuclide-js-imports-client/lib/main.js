"use strict";

function _createPackage() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons-atom/createPackage"));

  _createPackage = function () {
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

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
    return data;
  };

  return data;
}

function _textEdit() {
  const data = require("../../../modules/nuclide-commons-atom/text-edit");

  _textEdit = function () {
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

function convert() {
  const data = _interopRequireWildcard(require("../../nuclide-vscode-language-service-rpc/lib/convert"));

  convert = function () {
    return data;
  };

  return data;
}

function _nuclideLanguageService() {
  const data = require("../../nuclide-language-service");

  _nuclideLanguageService = function () {
    return data;
  };

  return data;
}

function _nuclideLanguageServiceRpc() {
  const data = require("../../nuclide-language-service-rpc");

  _nuclideLanguageServiceRpc = function () {
    return data;
  };

  return data;
}

function _nuclideOpenFiles() {
  const data = require("../../nuclide-open-files");

  _nuclideOpenFiles = function () {
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

function _featureConfig() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons-atom/feature-config"));

  _featureConfig = function () {
    return data;
  };

  return data;
}

function _QuickOpenProvider() {
  const data = _interopRequireDefault(require("./QuickOpenProvider"));

  _QuickOpenProvider = function () {
    return data;
  };

  return data;
}

function _JSSymbolSearchProvider() {
  const data = _interopRequireDefault(require("./JSSymbolSearchProvider"));

  _JSSymbolSearchProvider = function () {
    return data;
  };

  return data;
}

function _DashProjectSymbolProvider() {
  const data = _interopRequireDefault(require("./DashProjectSymbolProvider"));

  _DashProjectSymbolProvider = function () {
    return data;
  };

  return data;
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
// $FlowFB
async function connectToJSImportsService(connection) {
  const [fileNotifier, host] = await Promise.all([(0, _nuclideOpenFiles().getNotifierByConnection)(connection), (0, _nuclideLanguageService().getHostServices)()]);
  const service = (0, _nuclideRemoteConnection().getVSCodeLanguageServiceByConnection)(connection);
  const lspService = await service.createMultiLspLanguageService('jsimports', './pkg/nuclide-js-imports-server/src/index-entry.js', [], {
    fileNotifier,
    host,
    logCategory: 'jsimports',
    logLevel: _featureConfig().default.get('nuclide-js-imports-client.logLevel'),
    projectFileNames: ['.flowconfig'],
    fileExtensions: ['.js', '.jsx'],
    initializationOptions: getAutoImportSettings(),
    fork: true
  });
  return lspService || new (_nuclideLanguageServiceRpc().NullLanguageService)();
}

function createLanguageService() {
  const diagnosticsConfig = {
    version: '0.2.0',
    analyticsEventName: 'jsimports.observe-diagnostics'
  };
  const autocompleteConfig = {
    inclusionPriority: 1,
    suggestionPriority: 3,
    excludeLowerPriority: false,
    analytics: {
      eventName: 'nuclide-js-imports',
      shouldLogInsertedSuggestion: true
    },
    disableForSelector: null,
    autocompleteCacherConfig: null,
    supportsResolve: false
  };
  const codeActionConfig = {
    version: '0.1.0',
    priority: 0,
    analyticsEventName: 'jsimports.codeAction',
    applyAnalyticsEventName: 'jsimports.applyCodeAction'
  };
  const atomConfig = {
    name: 'JSAutoImports',
    grammars: ['source.js.jsx', 'source.js', 'source.flow'],
    diagnostics: diagnosticsConfig,
    autocomplete: autocompleteConfig,
    codeAction: codeActionConfig,
    typeHint: {
      version: '0.0.0',
      priority: 0.1,
      analyticsEventName: 'jsimports.typeHint'
    }
  };
  return new (_nuclideLanguageService().AtomLanguageService)(connectToJSImportsService, atomConfig, onDidInsertSuggestion);
}

function onDidInsertSuggestion({
  suggestion
}) {
  const {
    description,
    displayText,
    extraData,
    remoteUri,
    replacementPrefix,
    snippet,
    text,
    type
  } = suggestion;
  (0, _nuclideAnalytics().track)('nuclide-js-imports:insert-suggestion', {
    suggestion: {
      description,
      displayText,
      extraData,
      remoteUri,
      replacementPrefix,
      snippet,
      text,
      type
    }
  });
}

function getAutoImportSettings() {
  // Currently, we will get the settings when the package is initialized. This
  // means that the user would need to restart Nuclide for a change in their
  // settings to take effect. In the future, we would most likely want to observe
  // their settings and send DidChangeConfiguration requests to the server.
  // TODO: Observe settings changes + send to the server.
  return {
    componentModulePathFilter: _featureConfig().default.get('nuclide-js-imports-client.componentModulePathFilter'),
    diagnosticsWhitelist: _featureConfig().default.get('nuclide-js-imports-client.diagnosticsWhitelist'),
    requiresWhitelist: _featureConfig().default.get('nuclide-js-imports-client.requiresWhitelist')
  };
}

class Activation {
  constructor() {
    this._languageService = createLanguageService();

    this._languageService.activate();

    this._quickOpenProvider = new (_QuickOpenProvider().default)(this._languageService);
    this._commandSubscription = new (_UniversalDisposable().default)();
  }

  provideProjectSymbolSearch() {
    return new (_DashProjectSymbolProvider().default)(this._languageService);
  }

  provideJSSymbolSearchService() {
    return new (_JSSymbolSearchProvider().default)(this._languageService);
  }

  dispose() {
    this._languageService.dispose();

    this._commandSubscription.dispose();
  }

  registerQuickOpenProvider() {
    return this._quickOpenProvider;
  }

  consumeOrganizeRequiresService(organizeRequires) {
    this._commandSubscription.add(atom.commands.add('atom-text-editor', 'nuclide-js-imports:auto-require', async () => {
      const editor = atom.workspace.getActiveTextEditor();

      if (editor == null) {
        return;
      }

      const editorPath = editor.getPath();
      const fileVersion = await (0, _nuclideOpenFiles().getFileVersionOfEditor)(editor);

      if (fileVersion == null || editorPath == null) {
        return;
      }

      const buffer = editor.getBuffer();
      const languageService = await this._languageService.getLanguageServiceForUri(editorPath);

      if (languageService == null) {
        return;
      }

      const beforeEditsCheckpoint = buffer.createCheckpoint();
      const {
        edits,
        addedRequires,
        missingExports
      } = await languageService.sendLspRequest(editorPath, 'workspace/executeCommand', {
        command: 'getAllImports',
        arguments: [_nuclideUri().default.getPath(editorPath)]
      });

      if (!(0, _textEdit().applyTextEditsToBuffer)(buffer, convert().lspTextEdits_atomTextEdits(edits || []))) {
        // TODO(T24077432): Show the error to the user
        throw new Error('Could not apply edits to text buffer.');
      } // Then use nuclide-format-js to properly format the imports


      organizeRequires({
        addedRequires,
        missingExports
      });
      buffer.groupChangesSinceCheckpoint(beforeEditsCheckpoint);
    }));

    return this._commandSubscription;
  }

}

(0, _createPackage().default)(module.exports, Activation);