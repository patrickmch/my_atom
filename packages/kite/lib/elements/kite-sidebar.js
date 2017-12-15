'use strict';

const {CompositeDisposable} = require('atom');
const {DisposableEvent, stopPropagationAndDefault} = require('../utils');
const NavigablePanel = require('./navigable-panel');

const URI = 'atom://kite-sidebar';

class KiteSidebar extends NavigablePanel {
  static initClass() {
    return document.registerElement('kite-sidebar', {
      prototype: this.prototype,
    });
  }

  getURI() {
    return URI;
  }

  getTitle() {
    return 'Kite';
  }

  getPreferredLocation() {
    return atom.config.get('kite.sidebarPosition');
  }

  getAllowedLocations() {
    return ['left', 'right'];
  }

  isPermanentDockItem() {
    return false;
  }

  getPreferredWidth() {
    return atom.config.get('kite.sidebarWidth');
  }

  createdCallback() {
    this.innerHTML = `
      <div class="kite-sidebar-resizer"></div>
      <div class="kite-column">
        <header>
          <kite-navigable-stack-breadcrumb></kite-navigable-stack-breadcrumb>
          <button class="btn icon icon-x"></button>
        </header>

        <kite-navigable-stack></kite-navigable-stack>
      </div>
    `;

    this.closeBtn = this.querySelector('button.btn.icon-x');
    this.breadcrumb = this.querySelector('kite-navigable-stack-breadcrumb');
    this.content = this.querySelector('kite-navigable-stack');
    this.resizeHandle = this.querySelector('.kite-sidebar-resizer');
    this.element = this;

    this.emptyData();
  }

  attachedCallback() {
    this.subscribe();

    if (this.Kite) {
      this.classList.toggle('dockable', this.Kite.isUsingDockForSidebar());

      if (!this.Kite.isUsingDockForSidebar()) {
        this.subscriptions.add(new DisposableEvent(this.closeBtn, 'click', (e) => {
          atom.commands.dispatch(this, 'kite:close-sidebar');
        }));

        this.subscriptions.add(new DisposableEvent(this.resizeHandle, 'mousedown', e => {
          this.startResize(e);
        }));

        this.subscriptions.add(atom.config.observe('kite.sidebarWidth', (width) => {
          this.style.width = `${width}px`;
        }));
      } else {
        this.style.width = null;
      }
    }
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

  startResize(e) {
    const {pageX} = e;
    const initial = {
      startX: pageX,
      startWidth: this.offsetWidth,
      position: atom.config.get('kite.sidebarPosition'),
    };
    this.sizeChangedProgrammatically = true;
    this.initializeDragEvents(window, {
      'mousemove': stopPropagationAndDefault(e => this.resize(e, initial)),
      'mouseup': stopPropagationAndDefault(e => this.endResize(e, initial)),
    });
  }

  resize(e, {startX, startWidth, position}) {
    const {pageX} = e;
    const dif = pageX - startX;
    let width;

    if (position === 'left') {
      width = Math.min(1000, Math.max(100, startWidth + dif));
    } else {
      width = Math.min(1000, Math.max(100, startWidth - dif));
    }

    atom.config.set('kite.sidebarWidth', width);
  }

  endResize(e) {
    this.sizeChangedProgrammatically = false;
    this.dragSubscription.dispose();
    this.subscriptions.remove(this.dragSubscription);
  }

  initializeDragEvents(object, events) {
    this.dragSubscription = new CompositeDisposable();
    for (let event in events) {
      const callback = events[event];
      this.dragSubscription.add(new DisposableEvent(object, event, callback));
    }
    this.subscriptions.add(this.dragSubscription);
  }

  emptyData() {
    this.clear();
    this.content.innerHTML = `
    <ul class='background-message centered'>
      <li>
        <kite-logo></kite-logo>
        kite
      </li>
    </ul>
    `;
  }
}

module.exports = KiteSidebar.initClass();
