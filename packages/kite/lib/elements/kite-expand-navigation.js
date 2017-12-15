'use strict';

class KiteExpandNavigation extends HTMLElement {
  static initClass() {
    return document.registerElement('kite-expand-navigation', {
      prototype: this.prototype,
    });
  }

  attachedCallback() {
    this.innerHTML = `
    <div class="btn-group">
      <a class="btn icon icon-chevron-left" href="kite-atom-internal://previous"></a>
      <a class="btn icon icon-chevron-right" href="kite-atom-internal://next"></a>
    </div>
    `;
  }
}

module.exports = KiteExpandNavigation.initClass();
