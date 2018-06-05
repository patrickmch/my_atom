'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceAndPackage = undefined;

var _nuclideAdb;

function _load_nuclideAdb() {
  return _nuclideAdb = require('../nuclide-adb');
}

var _AtomInput;

function _load_AtomInput() {
  return _AtomInput = require('../nuclide-commons-ui/AtomInput');
}

var _Dropdown;

function _load_Dropdown() {
  return _Dropdown = require('../nuclide-commons-ui/Dropdown');
}

var _LoadingSpinner;

function _load_LoadingSpinner() {
  return _LoadingSpinner = require('../nuclide-commons-ui/LoadingSpinner');
}

var _debounce;

function _load_debounce() {
  return _debounce = _interopRequireDefault(require('../nuclide-commons/debounce'));
}

var _expected;

function _load_expected() {
  return _expected = require('../nuclide-commons/expected');
}

var _react = _interopRequireWildcard(require('react'));

var _AdbDeviceSelector;

function _load_AdbDeviceSelector() {
  return _AdbDeviceSelector = require('./AdbDeviceSelector');
}

var _EmulatorUtils;

function _load_EmulatorUtils() {
  return _EmulatorUtils = require('./EmulatorUtils');
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

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

class DeviceAndPackage extends _react.Component {
  constructor(props) {
    super(props);

    this._handleDeviceChange = device => {
      const state = {
        selectedDevice: device,
        packages: device == null ? (_expected || _load_expected()).Expect.value([]) : (_expected || _load_expected()).Expect.pendingValue([])
      };
      const value = this.props.deserialize();
      if (device != null && (this.state.selectedDevice == null || device.name !== this.state.selectedDevice.name) && value != null) {
        state.launchPackage = value;
      }

      this.setState(state, () => {
        this._refreshPackageList(device);
      });
    };

    this._setAdbPorts = (0, (_debounce || _load_debounce()).default)(this._setAdbPorts.bind(this), 1000);
    this.state = {
      selectedDevice: null,
      launchPackage: '',
      packages: (_expected || _load_expected()).Expect.value([]),
      adbPorts: ''
    };
  }

  async _setAdbPorts(value) {
    (0, (_EmulatorUtils || _load_EmulatorUtils()).setAdbPath)(this.props.targetUri, (await (0, (_EmulatorUtils || _load_EmulatorUtils()).getAdbPath)()));

    const parsedPorts = value.split(/,\s*/).map(port => parseInt(port.trim(), 10)).filter(port => !Number.isNaN(port));

    (0, (_EmulatorUtils || _load_EmulatorUtils()).addAdbPorts)(this.props.targetUri, parsedPorts);
    this.setState({ adbPorts: value, selectedDevice: null });
  }

  async _refreshPackageList(device) {
    if (device != null) {
      const packages = (_expected || _load_expected()).Expect.value((await (0, (_nuclideAdb || _load_nuclideAdb()).getAdbServiceByNuclideUri)(this.props.targetUri).getInstalledPackages(device)).sort());
      this.setState({
        packages
      });
    } else {
      this.setState({
        packages: (_expected || _load_expected()).Expect.value([])
      });
    }
  }

  setState(partialState, callback) {
    const fullState = Object.assign({}, this.state, partialState);
    super.setState(fullState, () => {
      this.props.onSelect(fullState.selectedDevice, fullState.launchPackage);
      callback && callback();
    });
  }

  render() {
    const devicesLabel = this.state.adbPorts === '' ? '' : '(ADB port ' + this.state.adbPorts + ')';
    return _react.createElement(
      'div',
      { className: 'block' },
      _react.createElement(
        'label',
        null,
        'ADB Server Port: '
      ),
      _react.createElement((_AtomInput || _load_AtomInput()).AtomInput, {
        placeholderText: 'Optional. (For One World devices, specify ANDROID_ADB_SERVER_PORT from one_world_adb)',
        title: 'Optional. (For One World devices, specify ANDROID_ADB_SERVER_PORT from one_world_adb)',
        value: this.state.adbPorts,
        onDidChange: value => this._setAdbPorts(value)
      }),
      _react.createElement(
        'label',
        null,
        'Device: ',
        devicesLabel
      ),
      _react.createElement((_AdbDeviceSelector || _load_AdbDeviceSelector()).AdbDeviceSelector, {
        onChange: this._handleDeviceChange,
        targetUri: this.props.targetUri
      }),
      _react.createElement(
        'label',
        null,
        'Package: '
      ),
      this.state.packages.isPending ? _react.createElement((_LoadingSpinner || _load_LoadingSpinner()).LoadingSpinner, { size: 'EXTRA_SMALL' }) : _react.createElement((_Dropdown || _load_Dropdown()).Dropdown, {
        disabled: this.state.selectedDevice == null,
        options: this.state.packages.isPending || this.state.packages.isError ? [] : this.state.packages.value.map(packageName => {
          return { value: packageName, label: packageName };
        }),
        onChange: value => this.setState({ launchPackage: value }),
        value: this.state.launchPackage
      })
    );
  }
}
exports.DeviceAndPackage = DeviceAndPackage;