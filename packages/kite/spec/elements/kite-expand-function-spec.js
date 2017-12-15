'use strict';

const KiteExpandFunction = require('../../lib/elements/kite-expand-function');
const {reportFromHover} = require('../../lib/kite-data-utils');

describe('KiteExpandFunction', () => {
  let json, element;

  describe('with hover data', () => {
    beforeEach(() => {
      json = require('../fixtures/test/increment.json');
      element = new KiteExpandFunction();
      element.setData(reportFromHover(json));
    });

    it('fills the name and type section with provided data', () => {
      expect(element.querySelector('.expand-header .name').textContent)
      .toEqual('Test.\u200Bincrement(n:int, *args, **kwargs)');
      expect(element.querySelector('.expand-header .type').textContent).toEqual('function');
    });

    // it('renders the synopsis in the summary div', () => {
    //   expect(element.querySelector('section.summary').textContent)
    //   .toEqual('synopsis here');
    // });

    it('renders as many parameters as needed', () => {
      const parameters = element.querySelector('section.parameters');

      expect(parameters).toExist();

      const dts = parameters.querySelectorAll('dt');
      const dds = parameters.querySelectorAll('dd');
      expect(dts.length).toEqual(3);
      expect(dds.length).toEqual(3);

      expect(dts[0].querySelector('.name').textContent).toEqual('n');
      expect(dts[0].querySelector('.type').textContent).toEqual('int');
      expect(dds[0].textContent).toEqual('n synopsis here');

      expect(dts[1].querySelector('.name').textContent).toEqual('*args');
      expect(dts[1].querySelector('.type').textContent).toEqual('list');
      expect(dds[1].textContent).toEqual('varargs synopsis here');

      expect(dts[2].querySelector('.name').textContent).toEqual('**kwargs');
      expect(dts[2].querySelector('.type').textContent).toEqual('dict');
      expect(dds[2].textContent).toEqual('kwargs synopsis here');
    });

    describe('when the function has no argument', () => {
      beforeEach(() => {
        json = require('../fixtures/test/increment-without-signature.json');
        element.setData(reportFromHover(json));
      });

      it('does not render the parameters section', () => {
        const parameters = element.querySelector('section.parameters');

        expect(parameters).not.toExist();
      });
    });

    describe('when the function has a javascript rest argument', () => {
      beforeEach(() => {
        json = require('../fixtures/test/increment-js.json');
        element.setData(reportFromHover(json));
      });

      it('fills the name and type section with provided data', () => {
        expect(element.querySelector('.expand-header .name').textContent)
        .toEqual('Test.\u200Bincrement(n:int, …opts)');
        expect(element.querySelector('.expand-header .type').textContent).toEqual('function');
      });

      it('renders the parameters section', () => {
        const parameters = element.querySelector('section.parameters');

        expect(parameters).toExist();

        const dts = parameters.querySelectorAll('dt');
        const dds = parameters.querySelectorAll('dd');
        expect(dts.length).toEqual(2);
        expect(dds.length).toEqual(2);


        expect(dts[0].querySelector('.name').textContent).toEqual('n');
        expect(dts[0].querySelector('.type').textContent).toEqual('int');
        expect(dds[0].textContent).toEqual('n synopsis here');

        expect(dts[1].querySelector('.name').textContent).toEqual('…opts');
        expect(dts[1].querySelector('.type').textContent).toEqual('array');
        expect(dds[1].textContent).toEqual('opts synopsis here');
      });
    });
  });

  describe('with value report data', () => {
    beforeEach(() => {
      json = require('../fixtures/test/increment-symbol.json');
      element = new KiteExpandFunction();
      element.setData(json);
    });

    it('fills the name and type section with provided data', () => {
      expect(element.querySelector('.expand-header .name').textContent)
      .toEqual('B.\u200Bincrement(n:int=0)');
      expect(element.querySelector('.expand-header .type').textContent).toEqual('function');
    });

    // it('renders the synopsis in the summary div', () => {
    //   expect(element.querySelector('section.summary').textContent)
    //   .toEqual('synopsis here');
    // });

    it('renders as many parameters as needed', () => {
      const parameters = element.querySelector('section.parameters');

      expect(parameters).toExist();

      const dts = parameters.querySelectorAll('dt');
      const dds = parameters.querySelectorAll('dd');
      expect(dts.length).toEqual(1);
      expect(dds.length).toEqual(1);

      expect(dts[0].querySelector('.name').textContent).toEqual('n=0');
      expect(dts[0].querySelector('.type').textContent).toEqual('int');
      expect(dds[0].textContent).toEqual('n synopsis here');
    });
  });
});
