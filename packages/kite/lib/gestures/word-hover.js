'use strict';

const MouseEventGesture = require('./mouse-event');
const {DisposableEvent} = require('../utils');

module.exports = class HoverGesture extends MouseEventGesture {
  constructor(editor, tokensList, options) {
    super(editor, tokensList, options);

    this.registerEvents();
  }

  dispose() {
    super.dispose();
    this.subscription.dispose();
  }

  registerEvents() {
    this.subscription = new DisposableEvent(this.editorElement, 'mousemove', (e) => {
      if (!this.matchesModifiers(e)) {
        this.deactivate();
        return;
      }

      if (e.target.matches(this.options.ignoredSelector)) { return; }

      const textRange = this.wordRangeForMouseEvent(event);

      if (textRange && this.lastRange && !this.lastRange.isEqual(textRange) && !textRange.isEmpty()) {
        const buffer = this.editor.getBuffer();
        this.activate({
          begin_bytes: buffer.characterIndexForPosition(textRange.start),
          end_bytes: buffer.characterIndexForPosition(textRange.end),
        });
      } else if (!textRange || textRange.isEmpty()) {
        this.deactivate();
      }

      this.lastRange = textRange;
    });
  }
};
