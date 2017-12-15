
const {CompositeDisposable, Disposable} = require('atom');
const {addDelegatedEventListener, DisposableEvent} = require('../utils');
const iconDocs = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.22 17"><defs><style>.cls-1{fill:#fff;}</style></defs><title>icon-docs</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path id="editor-books-library-collection-glyph" class="cls-1" d="M0,5.9V16.39c0,.31.36.55.8.55H3.23c.44,0,.8-.24.8-.55V5.9c0-.31-.36-.55-.8-.55H.8C.36,5.35,0,5.59,0,5.9Zm4.83-5V16.14a.81.81,0,0,0,.8.81H8.05a.8.8,0,0,0,.8-.81V.86a.81.81,0,0,0-.8-.81H5.62A.8.8,0,0,0,4.83.86Zm4.53.78,4,14.76a.81.81,0,0,0,1,.57l2.35-.63a.8.8,0,0,0,.56-1L13.24.6a.81.81,0,0,0-1-.57L9.91.66A.8.8,0,0,0,9.35,1.64Z"/></g></g></svg>';

const iconExamples = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22.96 17.23"><defs><style>.cls-1{fill:#fff;}</style></defs><title>icon-examples</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path class="cls-1" d="M7.18,14.12l-.63.63a.39.39,0,0,1-.58,0L.13,8.9a.39.39,0,0,1,0-.58L6,2.48a.39.39,0,0,1,.58,0l.63.63a.39.39,0,0,1,0,.58L2.25,8.62l4.93,4.93a.39.39,0,0,1,0,.58ZM14.59.73,9.91,16.93a.41.41,0,0,1-.19.24.35.35,0,0,1-.29,0L8.65,17a.41.41,0,0,1-.24-.19.38.38,0,0,1,0-.31L13.05.3a.41.41,0,0,1,.19-.24.35.35,0,0,1,.29,0l.78.21a.41.41,0,0,1,.24.19A.38.38,0,0,1,14.59.73ZM22.84,8.9,17,14.75a.39.39,0,0,1-.58,0l-.63-.63a.39.39,0,0,1,0-.58l4.93-4.93L15.79,3.68a.39.39,0,0,1,0-.58l.63-.63a.39.39,0,0,1,.58,0l5.85,5.85a.39.39,0,0,1,0,.58Z"/></g></g></svg>';
const elementResizeDetector = require('element-resize-detector')({strategy: 'scroll'});

class KiteExpandPanel extends HTMLElement {
  attachedCallback() {
    this.subscriptions = new CompositeDisposable();
    this.createJumpTo();
    this.handleCollapsibles();

    this.intersectionObserver = new IntersectionObserver((entries) => {
      const {intersectionRect} = entries[entries.length - 1];
      if (intersectionRect.width > 0 || intersectionRect.height > 0) {
        this.checkScroll();
      }
    });

    this.intersectionObserver.observe(this);
    this.checkScroll();

    const measureDimensions = () => { this.checkScroll(); };
    elementResizeDetector.listenTo(this, measureDimensions);
    this.subscriptions.add(new Disposable(() => { elementResizeDetector.removeListener(this, measureDimensions); }));

    window.addEventListener('resize', measureDimensions);
    this.subscriptions.add(new Disposable(() => { window.removeEventListener('resize', measureDimensions); }));
  }

  detachedCallback() {
    this.subscriptions && this.subscriptions.dispose();
    delete this.subscriptions;
  }

  checkScroll() {
    const container = this.querySelector('.sections-wrapper');
    this.classList.toggle('has-scroll', container.scrollHeight > container.offsetHeight);
  }

  createJumpTo() {
    const examplesSection = this.querySelector('.examples-from-your-code') ||
                            this.querySelector('.examples');
    const docsSection = this.querySelector('.summary');

    const links = [];

    if (docsSection) {
      links.push(`
        <a href="#"
           class="docs-button"
           data-jump=".summary">
          ${iconDocs}
          <span>Docs</span>
        </a>`);
    }

    if (examplesSection) {
      links.push(`
        <a href="#"
           class="examples-button"
           data-jump=".${examplesSection.className}">
          ${iconExamples}
          <span>Examples</span>
        </a>`);
    }

    if (links.length > 0) {
      const actions = this.querySelector('footer .actions');
      actions.innerHTML = `<span>Jump to</span> ${links.join(' ')}`;
    }

    this.subscriptions.add(addDelegatedEventListener(this, 'click', '[data-jump]', (e) => {
      const {target} = e;

      this.jumpTo(target.getAttribute('data-jump'));
    }));
  }

  jumpTo(targetCls) {
    const target = this.querySelector(targetCls);
    const container = this.querySelector('.sections-wrapper');
    const top = target.offsetTop;

    // const previous = this.querySelector('section.highlight-title');
    // if (previous) { previous.classList.remove('highlight-title'); }

    // target.classList.add('highlight-title');

    const offset = 0;
    container.scrollTop = top - offset;
  }

  handleCollapsibles() {
    [].slice.call(this.querySelectorAll('.collapsible')).forEach(collapsible => {
      const content = collapsible.querySelector('.section-content');

      let summaryLink = collapsible.querySelector('a[data-action="expand"]');
      if (!summaryLink) {
        summaryLink = document.createElement('a');
        summaryLink.href = '#';
        summaryLink.dataset.action = 'expand';
        summaryLink.innerHTML = 'show more&hellip;';

        this.subscriptions.add(new DisposableEvent(summaryLink, 'click', e => {
          e.preventDefault();
          if (summaryLink.dataset.action === 'expand') {
            summaryLink.dataset.action = 'collapse';
            summaryLink.innerHTML = 'show less&hellip;';
            collapsible.classList.remove('collapse');
          } else {
            summaryLink.dataset.action = 'expand';
            summaryLink.innerHTML = 'show more&hellip;';
            collapsible.classList.add('collapse');
          }
          this.scroll();
        }));
      }

      collapsible.classList.add('collapse');
      if (content.scrollHeight > content.offsetHeight) {
        collapsible.classList.add('overflow');
        collapsible.appendChild(summaryLink);
      } else {
        collapsible.classList.remove('overflow');
        if (summaryLink.parentNode) {
          collapsible.removeChild(summaryLink);
        }
      }
    });
  }
}

module.exports = KiteExpandPanel;
