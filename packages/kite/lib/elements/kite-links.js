'use strict';

const {CompositeDisposable, Emitter} = require('atom');
const LinkScheme = require('../link-scheme');
let Kite;

const {stripLeadingSlash, parseRangeInPath, parseDefinitionInPath} = require('../utils');

class KiteLinks extends HTMLElement {
  static initClass() {
    return document.registerElement('kite-links', {
      prototype: this.prototype,
    });
  }

  onDidClickMoreLink(listener) {
    return this.emitter.on('did-click-more-link', listener);
  }

  createdCallback() {
    this.emitter = new Emitter();
  }

  attachedCallback() {
    this.subscriptions = new CompositeDisposable();
    this.scheme = new LinkScheme('kite-atom-internal', this);

    this.subscriptions.add(this.scheme);
    this.subscriptions.add(this.emitter);
    this.subscriptions.add(this.scheme.onDidClickLink(({url, target}) => {
      if (!Kite) { Kite = require('../kite'); }
      const editor = atom.workspace.getActiveTextEditor();
      const kiteEditor = Kite.kiteEditorForEditor(editor);

      if (!editor || !kiteEditor) { return; }

      switch (url.host) {
        case 'goto': {
          const [filename, line] = parseDefinitionInPath(url.path);
          kiteEditor.openDefinition({filename, line}).catch(err => {
            atom.notifications.addWarning('Can\'t find the definition', {
              dismissable: true,
            });
          });
          break;
        }
        case 'goto-id': {
          const id = stripLeadingSlash(url.path);
          kiteEditor.openDefinitionForId(id).catch(() => {
            atom.notifications.addWarning(`Can't find a definition for id \`${id}\``, {
              dismissable: true,
            });
          });
          break;
        }
        case 'goto-range': {
          const range = parseRangeInPath(url.path);
          kiteEditor.openDefinitionAtRange(range)
          .catch(err => {
            atom.notifications.addWarning(`Can't find a definition at range \`${range}\``, {
              dismissable: true,
            });
          });
          break;
        }
        case 'open-range': {
          const range = parseRangeInPath(url.path);
          kiteEditor.openInWebAtRange(range);
          break;
        }
        case 'type':
        case 'expand': {
          this.emitter.emit('did-click-more-link');
          const id = stripLeadingSlash(url.path);
          kiteEditor.expandId(id);
          break;
        }
        case 'expand-range': {
          this.emitter.emit('did-click-more-link');
          const range = parseRangeInPath(url.path);
          kiteEditor.expandRange(range);
          break;
        }
      }
    }));
  }

  detachedCallback() {
    this.subscriptions && this.subscriptions.dispose();
  }
}

module.exports = KiteLinks.initClass();
