'use strict';

const {CompositeDisposable} = require('atom');

class NavigableStackBreadcrumb extends HTMLElement {
  static initClass() {
    return document.registerElement('kite-navigable-stack-breadcrumb', {
      prototype: this.prototype,
    });
  }

  createdCallback() {
    this.breadcrumb = [];
    this.innerHTML = `<div class="btn-group">
      <a href="kite-atom-internal://navigation-depth/previous" class="btn icon icon-chevron-left"></a>
      <a href="kite-atom-internal://navigation-depth/next" class="btn icon icon-chevron-right"></a>
    </div>
    <ul class="breadcrumb"></ul>`;

    this.breadcrumbList = this.querySelector('ul.breadcrumb');
    this.navigationBtns = this.querySelector('.btn-group');
  }

  clear() {
    this.breadcrumb = [];
    this.updateBreadcrumb();
  }

  includes(label) {
    return this.breadcrumb.includes(label);
  }

  indexOf(label) {
    return this.breadcrumb.indexOf(label);
  }

  subscribeToStack(stack) {
    const subscriptions = new CompositeDisposable();

    subscriptions.add(stack.onDidChange(() => {
      this.breadcrumb = Array.prototype.map.call(stack.children, (c) => {
        return c.getAttribute('data-id');
      });
      this.updateBreadcrumb();
    }));

    subscriptions.add(stack.onDidNavigate((depth) => {
      const breadcrumbItem = this.breadcrumbList.children[depth];
      this.setAttribute('depth', depth);

      depth === this.breadcrumb.length - 1
        ? this.setAttribute('last-step', '')
        : this.removeAttribute('last-step');

      if (breadcrumbItem) {
        this.breadcrumbList.scrollLeft = breadcrumbItem.offsetLeft;
      }
    }));

    return subscriptions;
  }

  updateBreadcrumb() {
    if (this.breadcrumb.length > 1) {
      this.breadcrumbList.innerHTML = this.breadcrumb.map((b, i, a) =>
      `<li class="item-${i}"><a href="kite-atom-internal://navigation-depth/${i}">${b.split(';').pop()}</a></li>`).join('');
      this.classList.remove('hidden');
    } else {
      this.breadcrumbList.innerHTML = '';
      this.classList.add('hidden');
    }
  }
}

module.exports = NavigableStackBreadcrumb.initClass();
