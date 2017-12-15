'use strict';

const path = require('path');
const KiteCuratedExample = require('../../lib/elements/kite-curated-example');

describe('KiteCuratedExample', () => {
  let example, data;

  beforeEach(() => {
    example = new KiteCuratedExample();

    waitsForPromise(() => atom.packages.activatePackage('language-python'));
  });

  describe('for a curated example with png file as input & output', () => {
    beforeEach(() => {
      data = require(path.resolve(__dirname, '..', 'fixtures', 'examples', 'free-type.json'));
      example.setData(data);
    });

    it('renders the input as an image', () => {
      const input = example.querySelector('.input');
      const img = input.querySelector('img');

      expect(input.nodeName).toEqual('FIGURE');
      expect(img.src).toEqual(`data:;base64,${data.inputFiles[0].contents_base64}`);
    });

    it('renders the output as an image', () => {
      const output = example.querySelector('.output');
      const img = output.querySelector('img');

      expect(output.nodeName).toEqual('FIGURE');
      expect(img.src).toEqual(`data:;base64,${data.code[1].content.data}`);
    });
  });

  describe('for a curated example with png file as input & output', () => {
    beforeEach(() => {
      data = require(path.resolve(__dirname, '..', 'fixtures', 'examples', 'csv-read.json'));
      example.setData(data);
    });

    it('renders the input as a text file', () => {
      const input = example.querySelector('.input');
      const pre = input.querySelector('pre');

      expect(input.nodeName).toEqual('FIGURE');
      expect(pre.textContent.trim().replace(/\s+/g, ' ')).toEqual('a,1 b,2');
    });

    it('renders the output as code sample', () => {
      const output = example.querySelector('.output');

      expect(output.nodeName).toEqual('PRE');
      expect(output.textContent.trim().replace(/\s+/g, ' ')).toEqual("['a', '1'] ['b', '2']");
    });
  });
});
