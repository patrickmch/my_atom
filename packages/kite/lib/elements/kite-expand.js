'use strict';

const {DisposableEvent} = require('../utils');
const NavigablePanel = require('./navigable-panel');

class KiteExpand extends NavigablePanel {
  static initClass() {
    return document.registerElement('kite-expand', {prototype: this.prototype});
  }

  createdCallback() {
    this.innerHTML = `
      <kite-navigable-stack></kite-navigable-stack>
      <kite-navigable-stack-breadcrumb></kite-navigable-stack-breadcrumb>
    `;

    this.breadcrumb = this.querySelector('kite-navigable-stack-breadcrumb');
    this.content = this.querySelector('kite-navigable-stack');
  }

  attachedCallback() {
    this.subscribe();

    this.subscriptions.add(new DisposableEvent(this, 'mousewheel', (e) => {
      e.stopPropagation();
    }));
  }

  detachedCallback() {
    this.unsubscribe();
  }

  openInWeb() {
    const step = this.content.currentStep;
    let link;
    if (step && (link = step.querySelector('kite-open-link'))) {
      link.open();
    }
  }
}

module.exports = KiteExpand.initClass();
