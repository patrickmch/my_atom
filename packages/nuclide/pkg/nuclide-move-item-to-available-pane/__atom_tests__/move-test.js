"use strict";

function _fsPromise() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/fsPromise"));

  _fsPromise = function () {
    return data;
  };

  return data;
}

function _nuclideUri() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
    return data;
  };

  return data;
}

function _main() {
  const data = require("../lib/main");

  _main = function () {
    return data;
  };

  return data;
}

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
 * @emails oncall+nuclide
 */
describe('nuclide-move-item-to-available-pane', () => {
  it('moves items across panes and creates new ones, as appropriate', async () => {
    (0, _main().activate)();
    const tempdir = await _fsPromise().default.tempdir();
    await atom.workspace.open(_nuclideUri().default.join(tempdir, 'A'));
    await atom.workspace.open(_nuclideUri().default.join(tempdir, 'B'));
    await atom.workspace.open(_nuclideUri().default.join(tempdir, 'C'));
    atom.workspace.getPanes()[0].activateItemAtIndex(0);
    assertWorkspaceState(['A*', 'B', 'C']);
    dispatchCmdKRight();
    assertWorkspaceState(['B', 'C'], ['A*']);
    dispatchCmdKCmdLeft();
    assertWorkspaceState(['B*', 'C'], ['A']);
    dispatchCmdKRight(); // TODO(mbolin): The rest of this test does not appear to run correctly because Atom does not
    // seem to layout the windows "for real," so the (x, y) ClientRect for each pane is reported
    // to be at (0, 0), which breaks the logic of nuclide-move-item-to-available-pane. If we can
    // figure out how to fix this, this would be a much better test. For now, we leave it here so
    // to illustrate the expected behavior.
    // assertWorkspaceState(['C'], ['A', 'B*']);
    //
    // dispatchCmdKRight();
    // assertWorkspaceState(['C'], ['A'], ['B*']);
    //
    // dispatchCmdKCmdLeft();
    // assertWorkspaceState(['C'], ['A*'], ['B']);
    //
    // dispatchCmdKLeft();
    // assertWorkspaceState(['C', 'A*'], ['B']);
    //
    // dispatchCmdKCmdRight();
    // assertWorkspaceState(['C', 'A'], ['B*']);
    //
    // dispatchCmdKLeft();
    // assertWorkspaceState(['C', 'A', 'B*']);
    //
    // dispatchCmdKLeft();
    // assertWorkspaceState(['B*'], ['C', 'A']);
    // TODO(mbolin): This is also an important test:
    // [A] [B, C*] [D]
    //
    // cmd-k down
    //
    // [A] [B] [D]
    //     [C*]
    //
    // cmd-k up
    //
    // [A] [B, C*] [D]
    //
    // Note that this test is necessary to verify that both the primaryComparator and
    // secondaryComparator are doing their job in move.js.
  });
});
/**
 * Each descriptor represents the pane items that a pane should contain. Each
 * element of a descriptor corresponds to the name of the file that the pane
 * item should be displaying. If the element ends with an asterisk, that
 * indicates that it should be the active pane item.
 */

function assertWorkspaceState(...descriptors) {
  const workspaceDescriptors = createDescriptorForWorkspaceState().map(descriptor => {
    return descriptor.filter(paneItem => paneItem.length > 0);
  }).filter(descriptor => descriptor.length > 0);
  expect(workspaceDescriptors).toEqual(descriptors);
}

function createDescriptorForWorkspaceState() {
  const activeItem = atom.workspace.getActiveTextEditor();
  return atom.workspace.getPanes().map(pane => {
    return pane.getItems().map(item => {
      const fileName = item.getPath();

      let name = _nuclideUri().default.basename(fileName);

      if (item === activeItem) {
        name += '*';
      }

      return name;
    });
  });
}

function dispatchCmdKRight() {
  const activeEditor = atom.workspace.getActiveTextEditor();

  if (!activeEditor) {
    throw new Error("Invariant violation: \"activeEditor\"");
  }

  const wasDispatched = atom.commands.dispatch(atom.views.getView(activeEditor), 'nuclide-move-item-to-available-pane:right');
  expect(wasDispatched).toBeTruthy();
} // eslint-disable-next-line no-unused-vars


function dispatchCmdKLeft() {
  const activeEditor = atom.workspace.getActiveTextEditor();

  if (!activeEditor) {
    throw new Error("Invariant violation: \"activeEditor\"");
  }

  const wasDispatched = atom.commands.dispatch(atom.views.getView(activeEditor), 'nuclide-move-item-to-available-pane:left');
  expect(wasDispatched).toBeTruthy();
}

function dispatchCmdKCmdLeft() {
  // In test mode, the command appears to get dispatched successfully, but the focus does not get
  // updated properly, so we have to provide some help.
  const activePane = atom.workspace.getActivePane();
  const panes = atom.workspace.getPanes();
  const index = panes.indexOf(activePane);
  const activeEditor = atom.workspace.getActiveTextEditor();

  if (!activeEditor) {
    throw new Error("Invariant violation: \"activeEditor\"");
  }

  const wasDispatched = atom.commands.dispatch(atom.views.getView(atom.workspace), 'window:focus-pane-on-left');
  expect(wasDispatched).toBeTruthy();
  const newIndex = Math.max(0, index - 1);
  panes[newIndex].activate();
} // eslint-disable-next-line no-unused-vars


function dispatchCmdKCmdRight() {
  // In test mode, the command appears to get dispatched successfully, but the focus does not get
  // updated properly, so we have to provide some help.
  const activePane = atom.workspace.getActivePane();
  const panes = atom.workspace.getPanes();
  const index = panes.indexOf(activePane);
  const activeEditor = atom.workspace.getActiveTextEditor();

  if (!activeEditor) {
    throw new Error("Invariant violation: \"activeEditor\"");
  }

  const wasDispatched = atom.commands.dispatch(atom.views.getView(activeEditor), 'window:focus-pane-on-right');
  expect(wasDispatched).toBe(true);
  const newIndex = Math.min(panes.length - 1, index + 1);
  panes[newIndex].activate();
}