'use strict';

const url = require('url');
const LinkScheme = require('../lib/link-scheme');
const {click} = require('./helpers/events');

describe('LinkScheme', () => {
  let scheme, spy, jasmineContent;
  beforeEach(() => {
    jasmineContent = document.querySelector('#jasmine-content');
    scheme = new LinkScheme('kite-atom-internal');
    spy = jasmine.createSpy();

    scheme.onDidClickLink(spy);
  });

  describe('when a link is clicked', () => {
    let link;
    describe('whose href match the scheme', () => {
      beforeEach(() => {
        link = document.createElement('a');
        link.href = 'kite-atom-internal://dummy/path';
        jasmineContent.appendChild(link);

        click(link);
      });

      it('emits a did-click-link event', () => {
        expect(spy).toHaveBeenCalledWith({
          target: link,
          url: url.parse('kite-atom-internal://dummy/path'),
        });
      });
    });

    describe('whose href does not match the scheme', () => {
      beforeEach(() => {
        link = document.createElement('a');
        link.href = 'foo://dummy/path';
        jasmineContent.appendChild(link);

        click(link);
      });

      it('does not emit a did-click-link event', () => {
        expect(spy).not.toHaveBeenCalled();
      });
    });
  });

  describe('when created with a DOM target', () => {
    beforeEach(() => {
      jasmineContent.innerHTML = `
        <a href="kite-atom-internal://dummy/path" id="l1"></a>
        <div id="container">
          <a href="kite-atom-internal://dummy/path" id="l2"></a>
        </div>
      `;

      scheme = new LinkScheme('kite-atom-internal', jasmineContent.querySelector('#container'));
      spy = jasmine.createSpy();

      scheme.onDidClickLink(spy);
    });

    describe('clicking on a link outside the target', () => {
      it('does not catch the click', () => {
        const link = jasmineContent.querySelector('a');

        click(link);

        expect(spy).not.toHaveBeenCalled();
      });
    });

    describe('clicking on a link inside the target', () => {
      it('does not catch the click', () => {
        const link = jasmineContent.querySelector('#container a');

        click(link);

        expect(spy).toHaveBeenCalled();
      });
    });
  });
});
