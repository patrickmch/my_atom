'use strict';

const {openDocumentationInWebURL} = require('../urls');
const {renderSymbolHeader, renderExtend, renderDefinition, renderUsages, renderDocs, renderExamples, debugData, renderLinks} = require('./html-utils');
const {idIsEmpty} = require('../kite-data-utils');
const KiteExpandPanel = require('./kite-expand-panel');

class KiteExpandInstance extends KiteExpandPanel {
  static initClass() {
    return document.registerElement('kite-expand-instance', {prototype: this.prototype});
  }

  setData(data) {
    const {symbol} = data;

    this.innerHTML = `
    ${renderSymbolHeader(symbol)}
    ${renderExtend(symbol)}

    <div class="scroll-wrapper">
      <div class="sections-wrapper">
        ${renderDocs(data)}
        ${renderUsages(data)}
        ${renderExamples(data)}
        ${renderDefinition(symbol)}
        ${renderLinks(data)}
        ${debugData(data)}
      </div>
    </div>

    <footer>
      <div class="actions"></div>
      ${!idIsEmpty(symbol.id)
        ? `<kite-open-link data-url="${openDocumentationInWebURL(symbol.id)}"></kite-open-link>`
      : ''}
    </footer>
    `;
  }
}

module.exports = KiteExpandInstance.initClass();
