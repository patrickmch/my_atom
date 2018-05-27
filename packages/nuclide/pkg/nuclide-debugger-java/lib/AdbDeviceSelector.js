'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.AdbDeviceSelector = exports.DEFAULT_ADB_PORT = undefined;















var _react = _interopRequireWildcard(require('react'));var _Dropdown;
function _load_Dropdown() {return _Dropdown = require('../../../modules/nuclide-commons-ui/Dropdown');}var _UniversalDisposable;
function _load_UniversalDisposable() {return _UniversalDisposable = _interopRequireDefault(require('../../../modules/nuclide-commons/UniversalDisposable'));}var _AdbDevicePoller;
function _load_AdbDevicePoller() {return _AdbDevicePoller = require('../../nuclide-adb-sdb-base/lib/AdbDevicePoller');}var _expected;
function _load_expected() {return _expected = require('../../../modules/nuclide-commons/expected');}var _LoadingSpinner;
function _load_LoadingSpinner() {return _LoadingSpinner = require('../../../modules/nuclide-commons-ui/LoadingSpinner');}var _collection;
function _load_collection() {return _collection = require('../../../modules/nuclide-commons/collection');}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}


const DEFAULT_ADB_PORT = exports.DEFAULT_ADB_PORT = 5037; /**
                                                           * Copyright (c) 2015-present, Facebook, Inc.
                                                           * All rights reserved.
                                                           *
                                                           * This source code is licensed under the license found in the LICENSE file in
                                                           * the root directory of this source tree.
                                                           *
                                                           * 
                                                           * @format
                                                           */const NO_DEVICES_MSG = 'No adb devices attached!';



class AdbDeviceSelector extends _react.Component {




  constructor(props) {
    super(props);
    this._disposables = new (_UniversalDisposable || _load_UniversalDisposable()).default();

    this._handleDeviceListChange = this._handleDeviceListChange.bind(
    this);

    this._handleDeviceDropdownChange = this._handleDeviceDropdownChange.bind(
    this);


    this.state = {
      deviceList: (_expected || _load_expected()).Expect.pendingValue([]),
      selectedDevice: null };

  }

  componentDidMount() {
    this._disposables.add(
    (0, (_AdbDevicePoller || _load_AdbDevicePoller()).observeAndroidDevicesX)(this.props.targetUri).
    startWith((_expected || _load_expected()).Expect.pendingValue([])).
    distinctUntilChanged((a, b) => {
      if (a.isPending || b.isPending) {
        return a.isPending === b.isPending;
      }

      if (a.isError || b.isError) {
        return a.isError === b.isError;
      }if (!(

      !a.isPending && !b.isPending && !a.isError && !b.isError)) {throw new Error('Invariant violation: "!a.isPending && !b.isPending && !a.isError && !b.isError"');}
      return (0, (_collection || _load_collection()).arrayEqual)(
      a.value != null ? a.value : [],
      b.value != null ? b.value : [],
      (x, y) => {
        return x.name === y.name && x.port === y.port;
      });

    }).
    subscribe(deviceList => this._handleDeviceListChange(deviceList)));

  }

  componentWillUnmount() {
    this._disposables.dispose();
  }

  _handleDeviceListChange(deviceList) {
    const previousDevice = this.state.selectedDevice;
    let selectedDevice =
    deviceList.isError || deviceList.isPending || previousDevice == null ?
    null :
    deviceList.value.find(device => device.name === previousDevice.name);

    if (
    selectedDevice == null &&
    !deviceList.isError &&
    !deviceList.isPending)
    {
      selectedDevice = deviceList.value[0];
    }

    this.setState({
      deviceList,
      selectedDevice });

    this.props.onChange(selectedDevice);
  }

  _getDeviceItems() {if (!(

    !this.state.deviceList.isError && !this.state.deviceList.isPending)) {throw new Error('Invariant violation: "!this.state.deviceList.isError && !this.state.deviceList.isPending"');}

    if (this.state.deviceList.value.length === 0) {
      return [{ value: null, label: NO_DEVICES_MSG }];
    }

    return this.state.deviceList.value.map(device => ({
      value: device,
      label:
      device.port === DEFAULT_ADB_PORT ?
      device.displayName :
      `${device.displayName} on ADB port ${device.port}` }));

  }

  render() {
    if (this.state.deviceList.isPending) {
      return _react.createElement((_LoadingSpinner || _load_LoadingSpinner()).LoadingSpinner, { size: 'EXTRA_SMALL' });
    }

    if (this.state.deviceList.isError) {
      return (
        _react.createElement('div', { className: 'nuclide-ui-message-error' },
          this.state.deviceList.error.toString()));


    }

    const deviceItems = this._getDeviceItems();
    return (
      _react.createElement((_Dropdown || _load_Dropdown()).Dropdown, {
        options: deviceItems,
        onChange: this._handleDeviceDropdownChange,
        value: this.state.selectedDevice }));


  }

  _handleDeviceDropdownChange(selectedDevice) {
    this.setState({
      selectedDevice });

    this.props.onChange(selectedDevice);
  }}exports.AdbDeviceSelector = AdbDeviceSelector;