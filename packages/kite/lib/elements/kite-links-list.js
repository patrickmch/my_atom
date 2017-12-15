'use strict';

const {CompositeDisposable} = require('atom');
const {renderLink, debugData} = require('./html-utils');

class KiteLinksList extends HTMLElement {
  static initClass() {
    return document.registerElement('kite-links-list', {
      prototype: this.prototype,
    });
  }

  setData(data) {
    this.links = data.report.links || [];

    this.subscriptions = new CompositeDisposable();

    this.innerHTML = `
    <div class="links-list">
      <ul>${this.links.map(m => renderLink(m)).join('')}</ul>
    </div>
    ${debugData(data)}
    `;

    this.list = this.querySelector('ul');
  }
}

module.exports = KiteLinksList.initClass();
