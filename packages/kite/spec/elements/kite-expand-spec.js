'use strict';

const KiteExpand = require('../../lib/elements/kite-expand');

describe('KiteExpand', () => {
  let expanded;

  beforeEach(() => {
    expanded = new KiteExpand();
  });

  it('exists', () => {
    expect(expanded).toExist();
  });
});
