const {CompositeDisposable, Disposable} = require('atom');
const {DisposableEvent, addDelegatedEventListener} = require('../utils');
const elementResizeDetector = require('element-resize-detector')({strategy: 'scroll'});

module.exports = class StickyTitle {
  constructor(stickies, scrollContainer) {
    requestAnimationFrame(() => {
      this.scrollContainer = scrollContainer;

      this.stickies = [].slice.call(stickies).map(title => {
        const sticky = document.createElement('div');
        sticky.className = 'sticky';
        sticky.innerHTML = title.innerHTML;
        title.innerHTML = '';
        title.appendChild(sticky);
        sticky.parentNode.style.height = sticky.offsetHeight + 'px';
        sticky.style.width = '100%'; //scrollContainer.offsetWidth + 'px';
        this.titleHeight = sticky.offsetHeight;
        return sticky;
      });

      this.subscriptions = new CompositeDisposable();
      this.subscriptions.add(new DisposableEvent(scrollContainer, 'scroll', e => {
        this.scroll();
      }));

      this.subscriptions.add(addDelegatedEventListener(scrollContainer, 'click', 'section h4 .sticky.fixed', (e) => {
        this.scrollTo(e.target.parentNode);
      }));

      this.subscriptions.add(addDelegatedEventListener(scrollContainer, 'mousewheel', 'section h4 .sticky.fixed', (e) => {
        scrollContainer.scrollTop += e.deltaY;
      }));

      this.handleCollapsibles();

      if (atom.views.pollDocument) {
        this.subscriptions.add(atom.views.pollDocument(() => { this.measureWidthAndHeight(); }));
      } else {
        this.intersectionObserver = new IntersectionObserver((entries) => {
          const {intersectionRect} = entries[entries.length - 1];
          if (intersectionRect.width > 0 || intersectionRect.height > 0) {
            this.measureWidthAndHeight();
          }
        });

        this.intersectionObserver.observe(scrollContainer);

        const measureDimensions = () => {
          this.measureWidthAndHeight();
        };
        elementResizeDetector.listenTo(scrollContainer, measureDimensions);
        this.subscriptions.add(new Disposable(() => {
          elementResizeDetector.removeListener(scrollContainer, measureDimensions);
        }));

        window.addEventListener('resize', measureDimensions);
        this.subscriptions.add(new Disposable(() => { window.removeEventListener('resize', measureDimensions); }));
      }

      this.scroll();
      this.measureWidthAndHeight();
    });
  }

  handleCollapsibles() {
    [].slice.call(this.scrollContainer.querySelectorAll('.collapsible')).forEach(collapsible => {
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

    this.scroll();
  }


  measureWidthAndHeight() {
    if (this.scrollContainer && (this.width == null || this.height == null ||
        this.width !== this.scrollContainer.offsetWidth ||
        this.height !== this.scrollContainer.offsetHeight)) {
      this.width = this.scrollContainer.offsetWidth;
      this.height = this.scrollContainer.offsetHeight;

      this.compactMode = this.titleHeight * this.stickies.length + 200 > this.height;
      this.scrollContainer.classList.toggle('compact', this.compactMode);

      requestAnimationFrame(() => this.scroll());
    }
  }

  dispose() {
    this.stickies && this.stickies.forEach(sticky => {
      const parent = sticky.parentNode;
      parent.innerHTML = sticky.innerHTML;
      parent.style.height = '';
    });
    this.subscriptions && this.subscriptions.dispose();
    this.stickies = null;
    this.scrollContainer = null;
    this.subscriptions = null;
  }

  scrollTo(target) {
    const containerBounds = this.scrollContainer.getBoundingClientRect();
    const scrollTop = this.scrollContainer.scrollTop;
    const top = target.getBoundingClientRect().top + scrollTop - containerBounds.top;

    const offset = this.stickies.reduce((memo, sticky) => {
      const parentBounds = sticky.parentNode.getBoundingClientRect();
      const parentTop = parentBounds.top + scrollTop - containerBounds.top;

      return parentTop < top ? memo + sticky.offsetHeight : memo;
    }, 0);

    this.scrollContainer.scrollTop = top - offset;
  }

  scroll() {
    if (!this.scrollContainer) { return; }

    if (this.compactMode) {
      this.stickies.forEach(sticky => sticky.classList.remove('fixed'));
    } else {
      const containerBounds = this.scrollContainer.getBoundingClientRect();
      const scrollTop = this.scrollContainer.scrollTop + containerBounds.top;
      const scrollBottom = scrollTop + containerBounds.height;

      let refTop = scrollTop;
      let refBottom = scrollBottom;

      let stickies = this.stickies.slice();

      stickies = stickies.filter((sticky, i) => {
        const parentBounds = sticky.parentNode.getBoundingClientRect();
        const parentTop = parentBounds.top + scrollTop - containerBounds.top;

        if (parentTop < refTop) {
          sticky.classList.add('fixed');
          sticky.style.top = (i * this.titleHeight) + 'px';
          refTop += this.titleHeight;
          return false;
        }
        return true;
      });

      stickies = stickies.reverse().filter((sticky, i) => {
        const parentBounds = sticky.parentNode.getBoundingClientRect();
        const parentBottom = parentBounds.bottom + scrollTop - containerBounds.top;

        if (parentBottom > refBottom) {
          sticky.classList.add('fixed');
          sticky.style.top = (containerBounds.height - ((i + 1) * this.titleHeight)) + 'px';

          refBottom -= this.titleHeight;
          return false;
        }

        return true;
      });

      stickies.forEach(sticky => sticky.classList.remove('fixed'));
    }
  }
};
