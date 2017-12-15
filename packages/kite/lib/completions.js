'use strict';

const DataLoader = require('./data-loader');
const KiteSignature = require('./elements/kite-signature');
const Plan = require('./plan');
let Kite;

const KiteProvider = {
  selector: '.source.python, .source.js',
  disableForSelector: [
    '.source.python .comment',
    '.source.python .string',
    '.source.js .comment',
    '.source.js .string',
  ].join(', '),
  inclusionPriority: 5,
  suggestionPriority: 5,
  excludeLowerPriority: false,

  // called to handle attribute completions
  getSuggestions(params) {
    let promise = Plan.queryPlan();
    if (this.isInsideFunctionCall(params)) {
      promise = promise.then(() => this.loadSignature(params));
    } else {
      this.clearSignature();
    }

    if (!atom.config.get('kite.enableCompletions', false)) {
      return promise.then(() => []);
    }
    if (!Kite) { Kite = require('./kite'); }

    return promise.then(() =>
      DataLoader.getCompletionsAtPosition(params.editor, params.bufferPosition));
  },

  isInsideFunctionCall({scopeDescriptor}) {
    return scopeDescriptor.scopes.some(s => s.indexOf('function-call') !== -1);
  },

  loadSignature({editor, bufferPosition}) {
    const compact = false;

    return DataLoader.getSignaturesAtPosition(editor, bufferPosition)
    .then(data => {
      if (data) {
        const listElement = this.getSuggestionsListElement( );

        listElement.maxVisibleSuggestions = compact
          ? atom.config.get('autocomplete-plus.maxVisibleSuggestions')
          : atom.config.get('kite.maxVisibleSuggestionsAlongSignature');

        this.signaturePanel = this.signaturePanel || new KiteSignature();
        this.signaturePanel.setListElement(listElement);

        this.signaturePanel.setData(data, compact);
        atom.config.get('kite.hideDocumentationWhenSignatureIsAvailable')
          ? this.signaturePanel.setAttribute('no-documentation', '')
          : this.signaturePanel.removeAttribute('no-documentation');

        const element = listElement.element
          ? listElement.element
          : listElement;

        element.style.width = null;
        element.insertBefore(this.signaturePanel, element.lastChild);
      }
    })
    .catch(err => {});
  },

  clearSignature() {
    if (this.signaturePanel && this.signaturePanel.parentNode) {
      this.signaturePanel.parentNode.removeChild(this.signaturePanel);
    }
  },

  getSuggestionsListElement() {
    if (!atom.packages.getAvailablePackageNames().includes('autocomplete-plus')) {
      return null;
    }

    if (this.suggestionListElement) { return this.suggestionListElement; }

    const pkg = atom.packages.getActivePackage('autocomplete-plus').mainModule;
    const list = pkg.autocompleteManager.suggestionList;
    this.suggestionListElement = list.suggestionListElement
      ? list.suggestionListElement
      : atom.views.getView(pkg.autocompleteManager.suggestionList);

    if (!this.suggestionListElement.ol) {
      this.suggestionListElement.renderList();
    }

    return this.suggestionListElement;
  },
};

module.exports = KiteProvider;
