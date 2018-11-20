"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AtomTextEditor = void 0;

function _classnames() {
  const data = _interopRequireDefault(require("classnames"));

  _classnames = function () {
    return data;
  };

  return data;
}

var React = _interopRequireWildcard(require("react"));

var _atom = require("atom");

function _textEditor() {
  const data = require("../nuclide-commons-atom/text-editor");

  _textEditor = function () {
    return data;
  };

  return data;
}

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _atomTabIndexForwarder() {
  const data = _interopRequireDefault(require("./atomTabIndexForwarder"));

  _atomTabIndexForwarder = function () {
    return data;
  };

  return data;
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * 
 * @format
 */
const doNothing = () => {};

function setupTextEditor(props) {
  const textBuffer = props.textBuffer || new _atom.TextBuffer(); // flowlint-next-line sketchy-null-string:off

  if (props.path) {
    // $FlowIgnore
    textBuffer.setPath(props.path);
  }

  const disposables = new (_UniversalDisposable().default)();

  if (props.onDidTextBufferChange != null) {
    disposables.add(textBuffer.onDidChangeText(props.onDidTextBufferChange));
  }

  const textEditorParams = {
    buffer: textBuffer,
    lineNumberGutterVisible: !props.gutterHidden,
    autoHeight: props.autoGrow
  };
  const textEditor = atom.workspace.buildTextEditor(textEditorParams);
  disposables.add(() => textEditor.destroy());

  if (props.grammar != null) {
    textEditor.setGrammar(props.grammar);
  } else {
    atom.grammars.autoAssignLanguageMode(textBuffer);
  }

  disposables.add((0, _textEditor().enforceSoftWrap)(textEditor, props.softWrapped)); // flowlint-next-line sketchy-null-string:off

  if (props.placeholderText) {
    textEditor.setPlaceholderText(props.placeholderText);
  }

  if (props.readOnly) {
    (0, _textEditor().enforceReadOnlyEditor)(textEditor);
  }

  return {
    disposables,
    textEditor
  };
}

class AtomTextEditor extends React.Component {
  componentDidMount() {
    this._editorDisposables = new (_UniversalDisposable().default)();

    this._updateTextEditor(setupTextEditor(this.props));

    this._onDidUpdateTextEditorElement(this.props);

    if (this.props.disabled) {
      this._updateDisabledState(true);
    }
  }

  _updateTextEditor(setup) {
    const container = this._rootElement;

    if (container == null) {
      return;
    }

    this._editorDisposables.dispose();

    const {
      textEditor,
      disposables
    } = setup;
    this._editorDisposables = new (_UniversalDisposable().default)(disposables);
    const textEditorElement = this._textEditorElement = document.createElement('atom-text-editor');
    textEditorElement.classList.add('nuclide-wrapped-editor');

    if (parseInt(this.props.tabIndex, 10) >= 0) {
      // Make tab move to next element instead of inserting a 'tab' character
      this._editorDisposables.add( // Make AtomTextEditor properly shift-tabbable
      (0, _atomTabIndexForwarder().default)(textEditorElement), // Make 'Tab' change focus instead of inserting tab character
      _rxjsCompatUmdMin.Observable.fromEvent(textEditorElement, 'keydown').subscribe(event => {
        if (event.key === 'Tab') {
          event.stopPropagation();
        }
      }));
    }

    textEditorElement.setModel(textEditor);
    textEditorElement.setAttribute('tabindex', this.props.tabIndex); // HACK! This is a workaround for the ViewRegistry where Atom has a default view provider for
    // TextEditor (that we cannot override), which is responsible for creating the view associated
    // with the TextEditor that we create and adding a mapping for it in its private views map.
    // To workaround this, we reach into the internals of the ViewRegistry and update the entry in
    // the map manually. Filed as https://github.com/atom/atom/issues/7954.
    // $FlowFixMe

    atom.views.views.set(textEditor, textEditorElement);

    if (this.props.correctContainerWidth) {
      this._editorDisposables.add(textEditorElement.onDidAttach(() => {
        const correctlySizedElement = textEditorElement.querySelector('.lines > :first-child');

        if (correctlySizedElement == null) {
          return;
        }

        container.style.width = correctlySizedElement.style.width;
      }));
    } // Attach to DOM.


    container.innerHTML = '';
    container.appendChild(textEditorElement);

    if (this.props.onConfirm != null) {
      this._editorDisposables.add(atom.commands.add(textEditorElement, {
        'core:confirm': () => {
          if (!(this.props.onConfirm != null)) {
            throw new Error("Invariant violation: \"this.props.onConfirm != null\"");
          }

          this.props.onConfirm();
        }
      }));
    }

    if (this.props.onInitialized != null) {
      this._editorDisposables.add(this.props.onInitialized(textEditor));
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.textBuffer !== this.props.textBuffer || nextProps.readOnly !== this.props.readOnly) {
      const previousTextContents = this.getTextBuffer().getText();
      const nextTextContents = nextProps.textBuffer == null ? nextProps.textBuffer : nextProps.textBuffer.getText();

      if (nextTextContents !== previousTextContents) {
        const textEditorSetup = setupTextEditor(nextProps);

        if (nextProps.syncTextContents) {
          textEditorSetup.textEditor.setText(previousTextContents);
        }

        this._updateTextEditor(textEditorSetup);

        this._onDidUpdateTextEditorElement(nextProps);
      }
    }

    if (nextProps.path !== this.props.path) {
      // $FlowIgnore
      this.getTextBuffer().setPath(nextProps.path || '');
    }

    if (nextProps.gutterHidden !== this.props.gutterHidden) {
      this.getModel().setLineNumberGutterVisible(nextProps.gutterHidden);
    }

    if (nextProps.grammar !== this.props.grammar) {
      this.getModel().setGrammar(nextProps.grammar);
    }

    if (nextProps.softWrapped !== this.props.softWrapped) {
      this.getModel().setSoftWrapped(nextProps.softWrapped);
    }

    if (nextProps.disabled !== this.props.disabled) {
      this._updateDisabledState(nextProps.disabled);
    }

    if (nextProps.placeholderText !== this.props.placeholderText) {
      this.getModel().setPlaceholderText(nextProps.placeholderText || '');
      this.getModel().scheduleComponentUpdate();
    }
  }

  _onDidUpdateTextEditorElement(props) {
    if (!props.readOnly) {
      return;
    } // TODO(most): t9929679 Remove this hack when Atom has a blinking cursor configuration API.


    const {
      component
    } = this.getElement();

    if (component == null) {
      return;
    }

    if (component.startCursorBlinking) {
      component.startCursorBlinking = doNothing;
      component.stopCursorBlinking();
    } else {
      const {
        presenter
      } = component;

      if (presenter == null) {
        return;
      }

      presenter.startBlinkingCursors = doNothing;
      presenter.stopBlinkingCursors(false);
    }
  }

  _updateDisabledState(isDisabled) {
    // Hack to set TextEditor to read-only mode, per https://github.com/atom/atom/issues/6880
    if (isDisabled) {
      this.getElement().removeAttribute('tabindex');
    } else {
      this.getElement().setAttribute('tabindex', this.props.tabIndex);
    }
  }

  getTextBuffer() {
    return this.getModel().getBuffer();
  }

  getModel() {
    return this.getElement().getModel();
  }

  getElement() {
    if (!this._textEditorElement) {
      throw new Error("Invariant violation: \"this._textEditorElement\"");
    }

    return this._textEditorElement;
  }

  render() {
    const className = (0, _classnames().default)(this.props.className, 'nuclide-text-editor-container', {
      'no-auto-grow': !this.props.autoGrow
    });
    return React.createElement("div", {
      className: className,
      ref: rootElement => this._rootElement = rootElement
    });
  } // This component wraps the imperative API of `<atom-text-editor>`, and so React's rendering
  // should always pass because this subtree won't change.


  shouldComponentUpdate(nextProps, nextState) {
    return false;
  }

  componentWillUnmount() {
    process.nextTick(() => this._editorDisposables.dispose());
  }

}

exports.AtomTextEditor = AtomTextEditor;
AtomTextEditor.defaultProps = {
  correctContainerWidth: true,
  disabled: false,
  gutterHidden: false,
  lineNumberGutterVisible: true,
  readOnly: false,
  autoGrow: false,
  syncTextContents: true,
  tabIndex: '0',
  // Keep in line with other input elements.
  softWrapped: false
};