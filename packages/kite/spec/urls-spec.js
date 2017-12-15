'use strict';

const urls = require('../lib/urls');

describe('urls helpers', () => {
  describe('internalGotoURL()', () => {
    it('escapes file paths in parameters', () => {
      const url = urls.internalGotoURL({
        filename: 'C:\\path\\to\\file.py',
        line: 123,
      });

      expect(url).toEqual('kite-atom-internal://goto/C:%5Cpath%5Cto%5Cfile.py:123');
    });
  });
});
