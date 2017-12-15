'use strict';

class KiteLocaltokenAnchor extends HTMLAnchorElement {
  static initClass() {
    return document.registerElement('kite-localtoken-anchor', {
      prototype: this.prototype,
      extends: 'a',
    });
  }
  createdCallback() {
    this.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      atom.applicationDelegate.openExternal(this.getAttribute('href'));
    });
  }
}

module.exports = KiteLocaltokenAnchor.initClass();
