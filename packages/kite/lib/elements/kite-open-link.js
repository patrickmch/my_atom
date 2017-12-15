'use strict';

const {humanizeKeystroke} = require('underscore-plus');
const {DisposableEvent} = require('../utils');
const metrics = require('../metrics.js');

class KiteOpenLink extends HTMLElement {
  static initClass() {
    return document.registerElement('kite-open-link', {
      prototype: this.prototype,
    });
  }

  detachedCallback() {
    this.subscription && this.subscription.dispose();
    this.innerHTML = '';
  }

  attachedCallback() {
    this.url = this.getAttribute('data-url');

    const content = this.innerHTML !== ''
      ? this.innerHTML
      : '<span>Open in Web</span>';

    this.innerHTML = `<a href="#">${content}</a><kite-logo/>`;

    const link = this.querySelector('a');
    this.subscription = new DisposableEvent(link, 'click', () => {
      metrics.featureRequested('open_in_web');
      atom.applicationDelegate.openExternal(this.url);
      metrics.featureFulfilled('open_in_web');
    });
  }

  open() {
    atom.applicationDelegate.openExternal(this.url);
  }
}

module.exports = KiteOpenLink.initClass();
