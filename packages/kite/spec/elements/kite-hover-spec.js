'use strict';

const {Range} = require('atom');
const KiteHover = require('../../lib/elements/kite-hover');

describe('KiteHover', () => {
  let hover, range, editor;

  beforeEach(() => {
    hover = new KiteHover();
    range = new Range([[0, 0], [1, 0]]);
    waitsForPromise(() => atom.workspace.open('sample.py')
      .then(e => editor = e));
  });

  describe('when the hover results has no symbols', () => {
    beforeEach(() => {
      hover.setData(require('../fixtures/empty-symbol.json'), editor, range);
    });

    it('clears the whole hover content', () => {
      expect(hover.innerHTML).toEqual('');
    });
  });

  describe('when the hover results has one symbol', () => {
    describe('for a class method with a signature', () => {
      beforeEach(() => {
        hover.setData(require('../fixtures/test/increment.json'), editor, range);
      });

      it('sets the name of the hover using the provided value', () => {
        const name = hover.querySelector('.name');

        expect(name.textContent).toEqual('Test.increment');
      });

      it('sets the return type of the hover using the provided value', () => {
        const type = hover.querySelector('.type');

        expect(type.textContent).toEqual('function');
      });
    });

    describe('for a class method without a signature', () => {
      beforeEach(() => {
        hover.setData(require('../fixtures/test/increment-without-signature.json'), editor, range);
      });

      it('sets the name of the hover using the provided value', () => {
        const name = hover.querySelector('.name');

        expect(name.textContent).toEqual('Test.increment');
      });

      it('uses the kind for the type', () => {
        const type = hover.querySelector('.type');

        expect(type.textContent).toEqual('function');
      });
    });

    describe('for a variable with a single type', () => {
      beforeEach(() => {
        hover.setData(require('../fixtures/variable.json'), editor, range);
      });

      it('sets the name of the hover using the provided value', () => {
        const name = hover.querySelector('.name');

        expect(name.textContent).toEqual('variable');
      });

      it('sets the type of the hover using the provided value', () => {
        const type = hover.querySelector('.type');

        expect(type.textContent).toEqual('instance');
      });
    });

    describe('for a variable with a union type', () => {
      beforeEach(() => {
        hover.setData(require('../fixtures/variable-with-union-type.json'), editor, range);
      });

      it('sets the name of the hover using the provided value', () => {
        const name = hover.querySelector('.name');

        expect(name.textContent).toEqual('variable');
      });

      it('sets the type of the hover using the provided value', () => {
        const type = hover.querySelector('.type');

        expect(type.textContent).toEqual('instance');
      });

      describe('that have duplicated types', () => {
        beforeEach(() => {
          hover.setData(require('../fixtures/parameter.json'), editor, range);
        });

        it('display only one instance for each unique type', () => {
          const type = hover.querySelector('.type');

          expect(type.textContent).toEqual('instance');
        });
      });
    });

    describe('for a variable without single type', () => {
      beforeEach(() => {
        hover.setData(require('../fixtures/variable-without-type.json'), editor, range);
      });

      it('sets the name of the hover using the provided value', () => {
        const name = hover.querySelector('.name');

        expect(name.textContent).toEqual('variable');
      });

      it('leaves the type empty', () => {
        const type = hover.querySelector('.type');
        expect(type.textContent).toEqual('instance');
      });
    });

    describe('for a function', () => {
      beforeEach(() => {
        hover.setData(require('../fixtures/hello.json'), editor, range);
      });

      it('sets the name of the hover using the provided value', () => {
        const name = hover.querySelector('.name');

        expect(name.textContent).toEqual('hello');
      });
    });
  });
});
