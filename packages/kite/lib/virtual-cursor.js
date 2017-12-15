'use strict';

const {Point} = require('atom');
let Cursor;

class VirtualCursor {
  static get DELEGATED_METHODS() {
    return [
      'getScreenRow', 'getScreenColumn', 'getBufferRow', 'getBufferColumn',
      'getCurrentBufferLine', 'isAtBeginningOfLine', 'isAtEndOfLine',
      'isSurroundedByWhitespace', 'isBetweenWordAndNonWord', 'isInsideWord',
      'getIndentLevel', 'getScopeDescriptor', 'hasPrecedingCharactersOnLine',
      'moveUp', 'moveDown', 'moveLeft', 'moveRight', 'moveToTop',
      'moveToBottom', 'moveToBeginningOfScreenLine', 'moveToBeginningOfLine',
      'moveToFirstCharacterOfLine', 'moveToEndOfScreenLine', 'moveToEndOfLine',
      'moveToBeginningOfWord', 'moveToEndOfWord', 'moveToBeginningOfNextWord',
      'moveToPreviousWordBoundary', 'moveToNextWordBoundary',
      'moveToPreviousSubwordBoundary', 'moveToNextSubwordBoundary',
      'skipLeadingWhitespace', 'moveToBeginningOfNextParagraph',
      'moveToBeginningOfPreviousParagraph',
      'getPreviousWordBoundaryBufferPosition',
      'getNextWordBoundaryBufferPosition',
      'getBeginningOfCurrentWordBufferPosition',
      'getEndOfCurrentWordBufferPosition',
      'getBeginningOfNextWordBufferPosition',
      'getCurrentWordBufferRange', 'getCurrentLineBufferRange',
      'getCurrentParagraphBufferRange', 'getCurrentWordPrefix',
      'wordRegExp', 'subwordRegExp', 'getNonWordCharacters', 'getScreenRange',
      'getBeginningOfNextParagraphBufferPosition',
      'getBeginningOfPreviousParagraphBufferPosition',
    ];
  }

  static initClass() {
    this.DELEGATED_METHODS.forEach(key => {
      this.prototype[key] = function(...args) {
        return Cursor.prototype[key].apply(this, args);
      };
    });
    return this;
  }

  constructor(editor, bufferPosition) {
    this.editor = editor;
    if (bufferPosition) { this.setBufferPosition(bufferPosition); }

    Cursor = Cursor || this.editor.getLastCursor().constructor;
  }

  setBufferPosition(position) {
    this.bufferPosition = Point.fromObject(position);
  }

  getBufferPosition() {
    return this.bufferPosition;
  }

  setScreenPosition(position, options) {
    if (position) {
      this.setBufferPosition(this.editor.bufferPositionForScreenPosition(position, options));
    }
  }

  getScreenPosition(options) {
    return this.editor.screenPositionForBufferPosition(this.bufferPosition, options);
  }
}

module.exports = VirtualCursor.initClass();
