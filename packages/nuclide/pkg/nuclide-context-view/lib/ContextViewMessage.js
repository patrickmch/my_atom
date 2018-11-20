"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var React = _interopRequireWildcard(require("react"));

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

/**
 * A message view to be shown in Context View.
 */
class ContextViewMessage extends React.Component {
  render() {
    return React.createElement("div", null, this.props.message);
  }

}

exports.default = ContextViewMessage;
ContextViewMessage.NO_DEFINITION = 'No definition selected.';
ContextViewMessage.LOADING = 'Loading...';
ContextViewMessage.NOT_LOGGED_IN = React.createElement("div", null, React.createElement("div", null, "You need to log in to see this data!"));