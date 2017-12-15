'use strict';

const url = require('url');
const {Emitter} = require('atom');
const {addDelegatedEventListener} = require('./utils');

module.exports = class LinkScheme {
  constructor(scheme, target = document) {
    this.scheme = scheme;
    this.schemeRegExp = new RegExp(`^${this.scheme}://`);
    this.emitter = new Emitter();
    this.subscription = addDelegatedEventListener(target, 'click', 'a', (e) => {
      const {target} = e;
      const uri = target && target.getAttribute('href');
      if (uri && this.schemeRegExp.test(uri)) {
        e.stopPropagation();
        this.emitter.emit('did-click-link', {
          target,
          url: url.parse(uri),
        });
      }
    });
  }

  dispose() {
    this.subscription.dispose();
    this.emitter.dispose();
  }

  onDidClickLink(listener) {
    return this.emitter.on('did-click-link', listener);
  }
};
