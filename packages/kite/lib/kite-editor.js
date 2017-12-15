'use strict';

let Kite, DataLoader, OverlayManager, WordHoverGesture, TokensList,
  HyperClickMode, SidebarMode, screenPositionForMouseEvent,
  pixelPositionForMouseEvent, delayPromise, kiteUtils, CompositeDisposable,
  symbolId, metrics;

class KiteEditor {
  constructor(editor) {
    this.editor = editor;
    this.buffer = editor.getBuffer();
    this.editorElement = atom.views.getView(editor);

    this.subscribeToEditor();
  }

  dispose() {
    this.subscriptions && this.subscriptions.dispose();
    delete this.subscriptions;
    delete this.editorElement;
    delete this.editor;
    delete this.buffer;
  }

  subscribeToEditor() {
    if (!CompositeDisposable) {
      ({CompositeDisposable} = require('atom'));
      ({screenPositionForMouseEvent, pixelPositionForMouseEvent, delayPromise} = require('./utils'));
      HyperClickMode = require('./modes/hyperclick');
      TokensList = require('./tokens-list');
      WordHoverGesture = require('./gestures/word-hover');
      DataLoader = require('./data-loader');
      SidebarMode = require('./modes/sidebar');
    }

    const editor = this.editor;
    const subs = new CompositeDisposable();

    this.subscriptions = subs;
    this.tokensList = new TokensList(editor);
    this.hyperClickMode = new HyperClickMode(this);
    this.mode = new SidebarMode(this);

    subs.add(this.mode);
    subs.add(this.tokensList);
    subs.add(this.hyperClickMode);

    subs.add(editor.onDidStopChanging(() => this.updateTokens()));

    this.hoverGesture = new WordHoverGesture(editor, this.tokensList, {
      ignoredSelector: 'atom-overlay, atom-overlay *',
    });
    subs.add(this.hoverGesture);

    subs.add(this.hoverGesture.onDidActivate(({range}) => {
      if (atom.config.get('kite.enableHoverUI')) {
        if (!OverlayManager) { OverlayManager = require('./overlay-manager'); }
        OverlayManager.showHoverAtRangeWithDelay(editor, range);
      }
    }));
    subs.add(this.hoverGesture.onDidDeactivate(() => {
      if (atom.config.get('kite.enableHoverUI')) {
        if (!OverlayManager) { OverlayManager = require('./overlay-manager'); }
        OverlayManager.dismissWithDelay();
      }
    }));

    subs.add(editor.onDidDestroy(() => {
      if (!Kite) { Kite = require('./kite'); }
      Kite.unsubscribeFromEditor(editor);
    }));
  }

  initialize() {
    if (!kiteUtils) {
      ({utils: kiteUtils} = require('kite-installer'));
    }

    return this.editor === atom.workspace.getActivePaneItem()
      ? new Promise((resolve, reject) => {
        return kiteUtils.retryPromise(() => delayPromise(() => this.updateTokens(), 100), 10, 100);
      })
      : Promise.resolve();
  }

  updateTokens() {
    return this.editor
      ? DataLoader.getTokensForEditor(this.editor).then(tokens => {
        this.tokensList.setTokens(tokens.tokens);
      }).catch(() => {})
      : Promise.reject('Editor was destroyed');
  }

  expandRange(range) {
    if (!metrics) { metrics = require('./metrics'); }

    metrics.featureRequested('expand_panel');
    metrics.featureRequested('documentation');
    return this.mode.expandRange(range);
  }

  expandId(id) {
    if (!metrics) { metrics = require('./metrics'); }

    metrics.featureRequested('expand_panel');
    metrics.featureRequested('documentation');
    return this.mode.expandId(id);
  }

  openInWebAtRange(range) {
    return DataLoader.openInWebAtRange(this.editor, range);
  }

  openTokenDefinition(token) {
    if (!token) { return Promise.resolve(false); }
    if (!symbolId) { ({symbolId} = require('./kite-data-utils')); }

    const symbol = token.Symbol || token.symbol;
    return DataLoader.getHoverDataAtRange(this.editor, this.tokensList.tokenRange(token))
    .then((data) => this.openDefinition(data.report.definition))
    .catch(() => {
      atom.notifications.addWarning(`Can't find a definition for token \`${symbol.name}\``, {
        dismissable: true,
      });
    });
  }

  openDefinitionForId(id) {
    return DataLoader.getValueReportDataForId(id)
    .then((data) => this.openDefinition(data.report.definition));
  }

  openDefinitionAtRange(range) {
    const token = this.tokensList.tokenAtRange(range);
    return this.openTokenDefinition(token);
  }

  openDefinition(definition) {
    if (!metrics) { metrics = require('./metrics'); }

    if (definition.filename.trim() === '') { return Promise.resolve(false); }

    return new Promise((resolve, reject) => {
      metrics.featureRequested('definition');
      if (definition) {
        return atom.workspace.open(definition.filename)
        .then(editor => {
          metrics.featureFulfilled('definition');
          editor.setCursorBufferPosition([
            definition.line - 1, 0,
          ], {
            autoscroll: true,
          });
          return true;
        });
      }
      return false;
    });
  }

  showHyperClickHighlight(range) {
    this.hyperclickMarker = this.editor.markBufferRange(range, {
      invalidate: 'touch',
    });
    this.editor.decorateMarker(this.hyperclickMarker, {
      type: 'highlight',
      class: 'kite-hyperclick',
    });
  }

  hideHyperClickHighlight() {
    if (this.hyperclickMarker ) {
      this.hyperclickMarker.destroy();
      delete this.hyperclickMarker;
    }
  }

  tokenAtPosition(position) {
    return this.tokensList.tokenAtPosition(position);
  }

  tokenAtScreenPosition(position) {
    return this.tokensList.tokenAtScreenPosition(position);
  }

  tokenForMouseEvent(event) {
    return this.tokensList.tokenForMouseEvent(event);
  }

  screenPositionForMouseEvent(event) {
    return screenPositionForMouseEvent(this.editorElement, event);
  }

  pixelPositionForMouseEvent(event) {
    return pixelPositionForMouseEvent(this.editorElement, event);
  }
}

module.exports = KiteEditor;
