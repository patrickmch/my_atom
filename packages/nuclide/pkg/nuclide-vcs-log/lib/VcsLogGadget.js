"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var React = _interopRequireWildcard(require("react"));

function _trackReactProfilerRender() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/trackReactProfilerRender"));

  _trackReactProfilerRender = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * 
 * @format
 */
// $FlowFixMe Profiler is neither stable nor typed
const Profiler = React.unstable_Profiler;

class VcsLogGadget extends React.Component {
  getTitle() {
    return this.props.title;
  }

  getIconName() {
    return this.props.iconName;
  }

  render() {
    const {
      component: Component
    } = this.props;
    return React.createElement(Profiler, {
      id: "VcsLogRoot",
      onRender: _trackReactProfilerRender().default
    }, React.createElement(Component, null));
  }

}

exports.default = VcsLogGadget;