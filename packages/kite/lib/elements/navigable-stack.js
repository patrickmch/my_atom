'use strict';

const {Emitter} = require('atom');

class NavigableStack extends HTMLElement {
  static initClass() {
    return document.registerElement('kite-navigable-stack', {
      prototype: this.prototype,
    });
  }

  onDidNavigate(listener) {
    return this.emitter.on('did-navigate', listener);
  }

  onDidChange(listener) {
    return this.emitter.on('did-change', listener);
  }

  createdCallback() {
    this.emitter = new Emitter();
  }

  // detachedCallback() {
  //   this.emitter && this.emitter.dispose();
  // }

  clear() {
    this.innerHTML = '';
    this.removeAttribute('depth');
    this.removeAttribute('last-step');
  }

  stack(label, element) {
    const depth = this.depth + 1;
    element.classList.add(`item-${depth}`);
    element.setAttribute('data-id', label);
    [].slice.call(this.children, depth).forEach(el => el.remove());
    this.appendChild(element);

    this.emitter.emit('did-change');

    setTimeout(() => this.goto(depth), 100);
  }

  goto(depth) {
    this.setAttribute('depth', depth);

    depth === this.children.length - 1
      ? this.setAttribute('last-step', '')
      : this.removeAttribute('last-step');

    this.emitter.emit('did-navigate', depth);
  }

  previous() {
    this.goto(Math.max(0, this.depth - 1));
  }

  next() {
    this.goto(Math.min(this.children.length - 1, this.depth + 1));
  }

  get depth() {
    return parseInt(this.getAttribute('depth') || '-1', 10);
  }

  get currentStep() {
    return this.children[this.depth];
  }
}

module.exports = NavigableStack.initClass();
