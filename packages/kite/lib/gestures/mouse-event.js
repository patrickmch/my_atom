'use strict';

const {Range} = require('atom');
const BaseGesture = require('./base');
const VirtualCursor = require('../virtual-cursor');
const {screenPositionForMouseEvent} = require('../utils');

module.exports = class MouseEventGesture extends BaseGesture {
  constructor(editor, tokensList, options) {
    super(editor, tokensList, options);
  }

  matchesModifiers(e) {
    return e.altKey == !!this.options.altKey &&
      e.ctrlKey == !!this.options.ctrlKey &&
      e.shiftKey == !!this.options.shiftKey &&
      e.metaKey == !!this.options.metaKey;
  }

  tokenForMouseEvent(event) {
    return this.tokensList.tokenForMouseEvent(event);
  }

  wordRangeForMouseEvent(event) {
    const position = screenPositionForMouseEvent(this.editorElement, event);

    if (position) {
      const cursor = new VirtualCursor(this.editor);
      cursor.setScreenPosition(position);

      return Range.fromObject(cursor.getCurrentWordBufferRange({
        includeNonWordCharacters: false,
      }));
    } else {
      return null;
    }
  }
};
