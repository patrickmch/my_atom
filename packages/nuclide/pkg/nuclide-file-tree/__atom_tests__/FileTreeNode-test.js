"use strict";

function _FileTreeNode() {
  const data = require("../lib/FileTreeNode");

  _FileTreeNode = function () {
    return data;
  };

  return data;
}

function Immutable() {
  const data = _interopRequireWildcard(require("immutable"));

  Immutable = function () {
    return data;
  };

  return data;
}

function _createStore() {
  const data = _interopRequireDefault(require("../lib/redux/createStore"));

  _createStore = function () {
    return data;
  };

  return data;
}

function Selectors() {
  const data = _interopRequireWildcard(require("../lib/redux/Selectors"));

  Selectors = function () {
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
 *  strict-local
 * @format
 * @emails oncall+nuclide
 */
describe('FileTreeNode', () => {
  let store;
  beforeEach(() => {
    store = (0, _createStore().default)();
  });
  it('properly sets the default properties', () => {
    const node = new (_FileTreeNode().FileTreeNode)({
      uri: '/abc/def',
      rootUri: '/abc/'
    }, Selectors().getConf(store.getState()));
    expect(node.uri).toBe('/abc/def');
    expect(node.rootUri).toBe('/abc/');
    expect(node.isExpanded).toBe(false);
    expect(node.isLoading).toBe(false);
    expect(node.isCwd).toBe(false);
    expect(node.children.isEmpty()).toBe(true);
    expect(node.highlightedText).toEqual('');
    expect(node.matchesFilter).toBeTruthy();
  });
  it('properly sets the supplied properties', () => {
    const children = Immutable().OrderedMap();
    const node = new (_FileTreeNode().FileTreeNode)({
      uri: '/abc/def',
      rootUri: '/abc/',
      isExpanded: true,
      isLoading: true,
      isCwd: true,
      children
    }, Selectors().getConf(store.getState()));
    expect(node.uri).toBe('/abc/def');
    expect(node.rootUri).toBe('/abc/');
    expect(node.isExpanded).toBe(true);
    expect(node.isLoading).toBe(true);
    expect(node.isCwd).toBe(true);
    expect(node.children).toBe(children);
    expect(node.highlightedText).toEqual('');
    expect(node.matchesFilter).toBeTruthy();
  });
  it('derives properties', () => {
    const node = new (_FileTreeNode().FileTreeNode)({
      uri: '/abc/def/ghi',
      rootUri: '/abc/'
    }, Selectors().getConf(store.getState())); // Derived

    expect(node.name).toBe('ghi');
    expect(node.relativePath).toBe('def/ghi');
    expect(node.localPath).toBe('/abc/def/ghi');
    expect(node.isContainer).toBe(false);
    expect(node.shouldBeShown).toBe(true);
    expect(node.checkedStatus).toBe('clear');
    expect(node.shouldBeSoftened).toBe(false);
    expect(node.highlightedText).toEqual('');
    expect(node.matchesFilter).toBeTruthy();
  });
  it('preserves instance on non-modifying updates', () => {
    const child1 = new (_FileTreeNode().FileTreeNode)({
      uri: '/abc/def/ghi1',
      rootUri: '/abc/'
    }, Selectors().getConf(store.getState()));
    const child2 = new (_FileTreeNode().FileTreeNode)({
      uri: '/abc/def/ghi2',
      rootUri: '/abc/'
    }, Selectors().getConf(store.getState()));
    const children = Immutable().OrderedMap([[child1.name, child1], [child2.name, child2]]);
    const node = new (_FileTreeNode().FileTreeNode)({
      uri: '/abc/def',
      rootUri: '/abc/',
      isExpanded: true,
      isLoading: false,
      isCwd: true,
      children
    }, Selectors().getConf(store.getState()));
    expect(node.isExpanded).toBe(true);
    let updatedNode = node.setIsExpanded(true);
    expect(updatedNode).toBe(node);
    updatedNode = node.setIsLoading(false);
    expect(updatedNode).toBe(node);
    updatedNode = node.setIsCwd(true);
    expect(updatedNode).toBe(node);
    updatedNode = node.setChildren(Immutable().OrderedMap(children));
    expect(updatedNode).toBe(node);
    updatedNode = node.setRecursive(null, child => child.setIsLoading(false));
    expect(updatedNode).toBe(node);
    updatedNode = node.set({
      isExpanded: true,
      isLoading: false,
      isCwd: true,
      children
    });
    expect(updatedNode).toBe(node);
    updatedNode = node.updateChild(child2.setIsExpanded(false));
    expect(updatedNode).toBe(node);
  });
  it('finds nodes', () => {
    const rootUri = '/r/';
    const nodeABC = new (_FileTreeNode().FileTreeNode)({
      uri: '/r/A/B/C/',
      rootUri
    }, Selectors().getConf(store.getState()));
    const nodeABD = new (_FileTreeNode().FileTreeNode)({
      uri: '/r/A/B/D/',
      rootUri
    }, Selectors().getConf(store.getState()));

    let children = _FileTreeNode().FileTreeNode.childrenFromArray([nodeABC, nodeABD]);

    const nodeAB = new (_FileTreeNode().FileTreeNode)({
      uri: '/r/A/B/',
      rootUri,
      children
    }, Selectors().getConf(store.getState()));
    children = _FileTreeNode().FileTreeNode.childrenFromArray([nodeAB]);
    const nodeA = new (_FileTreeNode().FileTreeNode)({
      uri: '/r/A/',
      rootUri,
      children
    }, Selectors().getConf(store.getState()));
    const nodeB = new (_FileTreeNode().FileTreeNode)({
      uri: '/r/B/',
      rootUri
    }, Selectors().getConf(store.getState()));
    children = _FileTreeNode().FileTreeNode.childrenFromArray([nodeA, nodeB]);
    const root = new (_FileTreeNode().FileTreeNode)({
      uri: '/r/',
      rootUri,
      children
    }, Selectors().getConf(store.getState()));
    expect(root.find('/r/')).toBe(root);
    expect(root.find('/r/A/')).toBe(nodeA);
    expect(root.find('/r/B/')).toBe(nodeB);
    expect(root.find('/r/A/B/')).toBe(nodeAB);
    expect(root.find('/r/A/B/C/')).toBe(nodeABC);
    expect(root.find('/r/A/B/D/')).toBe(nodeABD);
    expect(root.findDeepest('/r/A/B/E/')).toBe(nodeAB);
    expect(root.findDeepest('/r/A/B/C/E/')).toBe(nodeABC);
    expect(root.findDeepest('/r/B/B/C/E/')).toBe(nodeB);
    expect(root.findDeepest('/r/C/B/C/E/')).toBe(root);
    expect(root.find('/r/A/B/E/')).toBe(null);
    expect(root.findDeepest('/nonRoot/C/B/C/E/')).toBe(null);
  });
});