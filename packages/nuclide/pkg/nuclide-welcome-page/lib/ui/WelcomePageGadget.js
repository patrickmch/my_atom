"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getURIForTopic = getURIForTopic;
exports.default = exports.WELCOME_PAGE_VIEW_URI_PREFIX = exports.ALL_WELCOME_PAGE_TOPICS = void 0;

function _observePaneItemVisibility() {
  const data = _interopRequireDefault(require("../../../../modules/nuclide-commons-atom/observePaneItemVisibility"));

  _observePaneItemVisibility = function () {
    return data;
  };

  return data;
}

function _reactRedux() {
  const data = require("react-redux");

  _reactRedux = function () {
    return data;
  };

  return data;
}

function _Actions() {
  const data = require("../redux/Actions");

  _Actions = function () {
    return data;
  };

  return data;
}

var React = _interopRequireWildcard(require("react"));

function _WelcomePageComponent() {
  const data = require("./WelcomePageComponent");

  _WelcomePageComponent = function () {
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
 * 
 * @format
 */
const ALL_WELCOME_PAGE_TOPICS = 'all-welcome-pages';
exports.ALL_WELCOME_PAGE_TOPICS = ALL_WELCOME_PAGE_TOPICS;
const WELCOME_PAGE_VIEW_URI_PREFIX = 'atom://nuclide/welcome-page/';
exports.WELCOME_PAGE_VIEW_URI_PREFIX = WELCOME_PAGE_VIEW_URI_PREFIX;

function getURIForTopic(topic) {
  return WELCOME_PAGE_VIEW_URI_PREFIX + topic;
}

class WelcomePageGadget extends React.Component {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._customSubscribe = listener => {
      const {
        store
      } = this.props;
      return store.subscribe(() => {
        const {
          isWelcomePageVisible
        } = store.getState();

        if (!isWelcomePageVisible) {
          return;
        }

        listener();
      });
    }, _temp;
  }

  getTitle() {
    var _ref, _this$props$paneProps;

    return (_ref = (_this$props$paneProps = this.props.paneProps) === null || _this$props$paneProps === void 0 ? void 0 : _this$props$paneProps.title) !== null && _ref !== void 0 ? _ref : 'Welcome to Nuclide';
  }

  getIconName() {
    return 'nuclicon-nuclide';
  }

  componentDidMount() {
    this._visibilitySubscription = (0, _observePaneItemVisibility().default)(this).subscribe(visible => {
      this.didChangeVisibility(visible);
    });
  }

  componentWillUnmount() {
    // This ensures that if the pane is closed the visibility is updated
    this.props.store.dispatch((0, _Actions().updateWelcomePageVisibility)(false));

    this._visibilitySubscription.unsubscribe();
  }

  didChangeVisibility(visible) {
    if (!atom.workspace.getModalPanels().some(modal => modal.isVisible())) {
      // If we tab away from smartlog, activate the new item
      // so the user can interact immediately. But we should only do this
      // if no modal is visible, or else we'll focus behind the modal
      atom.workspace.getActivePane().activate();
    }

    this.props.store.dispatch((0, _Actions().updateWelcomePageVisibility)(visible));
  }

  render() {
    const {
      paneProps,
      store,
      topic
    } = this.props;
    const visibleStore = Object.assign({}, store, {
      subscribe: this._customSubscribe
    });
    return React.createElement(_reactRedux().Provider, {
      store: visibleStore
    }, React.createElement(_WelcomePageComponent().WelcomePageContainer, {
      className: paneProps === null || paneProps === void 0 ? void 0 : paneProps.className,
      topic: topic
    }));
  } // don't emit when welcome page is not visible to prevent needless re-calculations


  getDefaultLocation() {
    return 'center';
  }

  getURI() {
    return getURIForTopic(this.props.topic);
  }

}

exports.default = WelcomePageGadget;