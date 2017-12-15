'use strict';

const VirtualCursor = require('../lib/virtual-cursor');

describe('VirtualCursor', () => {
  let editor, cursor, Cursor;

  beforeEach(() => {
    waitsForPromise(() => atom.packages.activatePackage('language-python'));
    waitsForPromise(() => atom.workspace.open('sample.py').then(e => {
      editor = e;
    }));
    runs(() => {
      cursor = new VirtualCursor(editor);
    });
  });

  describe('.setScreenPosition()', () => {
    it('changes the screen position of the cursor', () => {
      cursor.setScreenPosition([3, 8]);

      expect(cursor.getScreenPosition()).toEqual([3, 8]);
      expect(cursor.getBufferPosition()).toEqual([3, 8]);
    });
  });

  describe('.setBufferPosition()', () => {
    it('changes the buffer position of the cursor', () => {
      cursor.setBufferPosition([3, 8]);

      expect(cursor.getScreenPosition()).toEqual([3, 8]);
      expect(cursor.getBufferPosition()).toEqual([3, 8]);
    });
  });

  VirtualCursor.DELEGATED_METHODS.forEach(key => {
    describe(`.${key}()`, () => {
      beforeEach(() => {
        Cursor = Cursor || editor.getLastCursor().constructor;

        spyOn(Cursor.prototype, key);
      });

      it('delegates the call to the Cursor prototype', () => {
        cursor[key]();

        expect(Cursor.prototype[key]).toHaveBeenCalled();
      });
    });
  });


});
