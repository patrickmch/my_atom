'use strict';

const KiteExpandModule = require('../../lib/elements/kite-expand-module');
const {reportFromHover} = require('../../lib/kite-data-utils');

describe('KiteExpandModule', () => {
  let json, element;

  beforeEach(() => {
    json = require('../fixtures/os.json');
    element = new KiteExpandModule();
    element.setData(reportFromHover(json));
  });

  it('fills the name and type section with provided data', () => {
    expect(element.querySelector('.expand-header .name').textContent).toEqual('os');
    expect(element.querySelector('.expand-header .type').textContent).toEqual('module');
  });

  // it('uses the synopsis to fill the summary', () => {
  //   expect(element.querySelector('section.summary').innerHTML)
  //   .toEqual(json.report.description_html);
  // });

  it('displays the first two members in the member section', () => {
    const lis = element.querySelectorAll('section.top-members li');

    expect(lis.length).toEqual(2);

    expect(lis[0].querySelector('a').textContent).toEqual('spawnvp()');
    expect(lis[1].querySelector('a').textContent).toEqual('WSTOPSIG()');
  });

  it('displays the show more link', () => {
    const link = element.querySelector('section.top-members a.more-members');

    expect(link.textContent).toEqual('See 228 more members');
  });

  describe('when the module has no members', () => {
    beforeEach(() => {
      json = require('../fixtures/module-with-no-members.json');
      element.setData(reportFromHover(json));
    });

    it('does not render a members section', () => {
      expect(element.querySelector('section.top-members')).not.toExist();
    });
  });

  describe('when the module has exactly two members', () => {
    beforeEach(() => {
      json = require('../fixtures/module-with-two-members.json');
      element.setData(reportFromHover(json));
    });

    it('does not render the show more link', () => {
      const link = element.querySelector('section.top-members a.more-members');

      expect(link).not.toExist();
    });
  });
});
