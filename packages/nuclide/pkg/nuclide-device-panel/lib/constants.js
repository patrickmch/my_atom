"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AnalyticsActions = void 0;

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 *  strict
 * @format
 */
const ANALYTICS_PREFIX = 'nuclide-device-panel';
const AnalyticsActions = Object.freeze({
  APPINFOTABLES_DATA_VALUE: `${ANALYTICS_PREFIX}:app-info-tables.data.value`,
  APPINFOTABLES_DATA_ERROR: `${ANALYTICS_PREFIX}:app-info-tables.data.error`,
  APPINFOTABLES_UI_MOUNT: `${ANALYTICS_PREFIX}:app-info-tables.ui.mount`,
  APPINFOTABLES_UI_UNMOUNT: `${ANALYTICS_PREFIX}:app-info-tables.ui.unmount`,
  APPINFOVALUECELL_UI_VALUE: `${ANALYTICS_PREFIX}:app-info-value-cell.ui.value`,
  APPINFOVALUECELL_UI_ERROR: `${ANALYTICS_PREFIX}:app-info-value-cell.ui.error`,
  APPINFOVALUECELL_UI_EDITINGSTATECHANGE: `${ANALYTICS_PREFIX}:app-info-value-cell.ui.editing-state-change`
});
exports.AnalyticsActions = AnalyticsActions;