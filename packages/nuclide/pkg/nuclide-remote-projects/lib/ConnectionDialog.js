"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ConnectionDialogModes = void 0;

function _AuthenticationPrompt() {
  const data = _interopRequireDefault(require("./AuthenticationPrompt"));

  _AuthenticationPrompt = function () {
    return data;
  };

  return data;
}

function _Button() {
  const data = require("../../../modules/nuclide-commons-ui/Button");

  _Button = function () {
    return data;
  };

  return data;
}

function _ButtonGroup() {
  const data = require("../../../modules/nuclide-commons-ui/ButtonGroup");

  _ButtonGroup = function () {
    return data;
  };

  return data;
}

function _ConnectionDetailsPrompt() {
  const data = _interopRequireDefault(require("./ConnectionDetailsPrompt"));

  _ConnectionDetailsPrompt = function () {
    return data;
  };

  return data;
}

function _IndeterminateProgressBar() {
  const data = _interopRequireDefault(require("./IndeterminateProgressBar"));

  _IndeterminateProgressBar = function () {
    return data;
  };

  return data;
}

var React = _interopRequireWildcard(require("react"));

var _electron = _interopRequireDefault(require("electron"));

function _formValidationUtils() {
  const data = require("./form-validation-utils");

  _formValidationUtils = function () {
    return data;
  };

  return data;
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 *  strict-local
 * @format
 */
const {
  remote
} = _electron.default;

if (!(remote != null)) {
  throw new Error("Invariant violation: \"remote != null\"");
}

const ConnectionDialogModes = {
  REQUEST_CONNECTION_DETAILS: 1,
  WAITING_FOR_CONNECTION: 2,
  REQUEST_AUTHENTICATION_DETAILS: 3,
  WAITING_FOR_AUTHENTICATION: 4
};
/**
 * Component that manages the state transitions as the user connects to a server.
 */

exports.ConnectionDialogModes = ConnectionDialogModes;

class ConnectionDialog extends React.Component {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._handleDidChange = () => {
      this.props.setDirty(true);
    }, this._handleClickSave = () => {
      if (!(this.props.connectionProfiles != null)) {
        throw new Error("Invariant violation: \"this.props.connectionProfiles != null\"");
      }

      const selectedProfile = this.props.connectionProfiles[this.props.selectedProfileIndex];
      const connectionDetailsPrompt = this._content;

      if (!(connectionDetailsPrompt instanceof _ConnectionDetailsPrompt().default)) {
        throw new Error("Invariant violation: \"connectionDetailsPrompt instanceof ConnectionDetailsPrompt\"");
      }

      const connectionDetails = connectionDetailsPrompt.getFormFields();
      const validationResult = (0, _formValidationUtils().validateFormInputs)(selectedProfile.displayTitle, connectionDetails, '');

      if (typeof validationResult.errorMessage === 'string') {
        atom.notifications.addError(validationResult.errorMessage);
        return;
      }

      if (!(validationResult.validatedProfile != null && typeof validationResult.validatedProfile === 'object')) {
        throw new Error("Invariant violation: \"validationResult.validatedProfile != null &&\\n        typeof validationResult.validatedProfile === 'object'\"");
      } // Save the validated profile, and show any warning messages.


      const newProfile = validationResult.validatedProfile;

      if (typeof validationResult.warningMessage === 'string') {
        atom.notifications.addWarning(validationResult.warningMessage);
      }

      this.props.onSaveProfile(this.props.selectedProfileIndex, newProfile);
      this.props.setDirty(false);
    }, this._cancel = () => {
      this.props.cancelConnection();
    }, this.ok = () => {
      const {
        mode
      } = this.props;

      if (mode === ConnectionDialogModes.REQUEST_CONNECTION_DETAILS) {
        // User is trying to submit connection details.
        const connectionDetailsForm = this._content;

        if (!(connectionDetailsForm instanceof _ConnectionDetailsPrompt().default)) {
          throw new Error("Invariant violation: \"connectionDetailsForm instanceof ConnectionDetailsPrompt\"");
        }

        const {
          username,
          server,
          cwd,
          remoteServerCommand,
          sshPort,
          pathToPrivateKey,
          authMethod,
          password,
          displayTitle
        } = connectionDetailsForm.getFormFields();

        if (!this._validateInitialDirectory(cwd)) {
          remote.dialog.showErrorBox('Invalid initial path', 'Please specify a non-root directory.');
          return;
        }

        if (username && server && cwd && remoteServerCommand) {
          this.props.connect({
            host: server,
            sshPort: parseInt(sshPort, 10),
            username,
            pathToPrivateKey,
            authMethod,
            cwd,
            remoteServerCommand,
            password,
            // Modified profiles probably don't match the display title.
            displayTitle: this.props.dirty ? '' : displayTitle
          });
        } else {
          remote.dialog.showErrorBox('Missing information', "Please make sure you've filled out all the form fields.");
        }
      } else if (mode === ConnectionDialogModes.REQUEST_AUTHENTICATION_DETAILS) {
        const authenticationPrompt = this._content;

        if (!(authenticationPrompt instanceof _AuthenticationPrompt().default)) {
          throw new Error("Invariant violation: \"authenticationPrompt instanceof AuthenticationPrompt\"");
        }

        const password = authenticationPrompt.getPassword();
        this.props.confirmConnectionPrompt([password]);
        this.props.setDirty(false);
        this.props.setMode(ConnectionDialogModes.WAITING_FOR_AUTHENTICATION);
      }
    }, this.onProfileClicked = selectedProfileIndex => {
      this.props.setDirty(false);
      this.props.onProfileSelected(selectedProfileIndex);
    }, _temp;
  }

  componentDidMount() {
    this._focus();
  }

  componentDidUpdate(prevProps) {
    if (this.props.mode !== prevProps.mode) {
      this._focus();
    } else if (this.props.mode === ConnectionDialogModes.REQUEST_CONNECTION_DETAILS && this.props.selectedProfileIndex === prevProps.selectedProfileIndex && !this.props.dirty && prevProps.dirty && this._okButton != null) {
      // When editing a profile and clicking "Save", the Save button disappears. Focus the primary
      // button after re-rendering so focus is on a logical element.
      this._okButton.focus();
    }
  }

  _focus() {
    const content = this._content;

    if (content == null) {
      if (this._cancelButton == null) {
        return;
      }

      this._cancelButton.focus();
    } else {
      content.focus();
    }
  }

  _validateInitialDirectory(path) {
    return path !== '/';
  }

  render() {
    const mode = this.props.mode;
    let content;
    let isOkDisabled;
    let okButtonText;

    if (mode === ConnectionDialogModes.REQUEST_CONNECTION_DETAILS) {
      content = React.createElement(_ConnectionDetailsPrompt().default, {
        error: this.props.error,
        connectionProfiles: this.props.connectionProfiles,
        selectedProfileIndex: this.props.selectedProfileIndex,
        onAddProfileClicked: this.props.onAddProfileClicked,
        onCancel: this._cancel,
        onConfirm: this.ok,
        onDeleteProfileClicked: this.props.onDeleteProfileClicked,
        onDidChange: this._handleDidChange,
        onProfileClicked: this.onProfileClicked,
        ref: prompt => {
          this._content = prompt;
        }
      });
      isOkDisabled = false;
      okButtonText = 'Connect';
    } else if (mode === ConnectionDialogModes.WAITING_FOR_CONNECTION || mode === ConnectionDialogModes.WAITING_FOR_AUTHENTICATION) {
      content = React.createElement(_IndeterminateProgressBar().default, null);
      isOkDisabled = true;
      okButtonText = 'Connect';
    } else {
      content = React.createElement(_AuthenticationPrompt().default, {
        instructions: this.props.connectionPromptInstructions,
        onCancel: this._cancel,
        onConfirm: this.ok,
        ref: prompt => {
          this._content = prompt;
        }
      });
      isOkDisabled = false;
      okButtonText = 'OK';
    }

    let saveButtonGroup;
    let selectedProfile;

    if (this.props.selectedProfileIndex >= 0 && this.props.connectionProfiles != null) {
      selectedProfile = this.props.connectionProfiles[this.props.selectedProfileIndex];
    }

    if (this.props.dirty && selectedProfile != null && selectedProfile.saveable) {
      saveButtonGroup = React.createElement(_ButtonGroup().ButtonGroup, {
        className: "inline-block"
      }, React.createElement(_Button().Button, {
        onClick: this._handleClickSave
      }, "Save"));
    }

    return React.createElement("div", null, React.createElement("div", {
      className: "block"
    }, content), React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end'
      }
    }, saveButtonGroup, React.createElement(_ButtonGroup().ButtonGroup, null, React.createElement(_Button().Button, {
      onClick: this._cancel,
      ref: button => {
        this._cancelButton = button;
      }
    }, "Cancel"), React.createElement(_Button().Button, {
      buttonType: _Button().ButtonTypes.PRIMARY,
      disabled: isOkDisabled,
      onClick: this.ok,
      ref: button => {
        this._okButton = button;
      }
    }, okButtonText))));
  }

  getFormFields() {
    const connectionDetailsForm = this._content;

    if (!connectionDetailsForm) {
      return null;
    }

    if (!(connectionDetailsForm instanceof _ConnectionDetailsPrompt().default)) {
      throw new Error("Invariant violation: \"connectionDetailsForm instanceof ConnectionDetailsPrompt\"");
    }

    const {
      username,
      server,
      cwd,
      remoteServerCommand,
      sshPort,
      pathToPrivateKey,
      authMethod,
      displayTitle
    } = connectionDetailsForm.getFormFields();
    return {
      username,
      server,
      cwd,
      remoteServerCommand,
      sshPort,
      pathToPrivateKey,
      authMethod,
      displayTitle
    };
  }

}

exports.default = ConnectionDialog;