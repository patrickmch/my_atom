"use strict";

function _RecentFilesProvider() {
  const data = require("../lib/RecentFilesProvider");

  _RecentFilesProvider = function () {
    return data;
  };

  return data;
}

var React = _interopRequireWildcard(require("react"));

function _testUtils() {
  const data = _interopRequireDefault(require("react-dom/test-utils"));

  _testUtils = function () {
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
 * @emails oncall+nuclide
 */
let provider = null;
const PROJECT_PATH = '/Users/testuser/';
const PROJECT_PATH2 = '/Users/something_else/';
const FILE_PATHS = [PROJECT_PATH + 'foo/bla/foo.js', PROJECT_PATH + 'foo/bla/bar.js', PROJECT_PATH + 'foo/bla/baz.js'];
const FAKE_RECENT_FILES = FILE_PATHS.map((path, i) => ({
  resultType: 'FILE',
  path,
  timestamp: 1e8 - i * 1000,
  matchIndexes: [],
  score: 1
}));
const FakeRecentFilesService = {
  getRecentFiles: () => Promise.resolve(FAKE_RECENT_FILES),
  touchFile: path => Promise.resolve()
};

let fakeGetProjectPathsImpl = () => [];

const fakeGetProjectPaths = () => fakeGetProjectPathsImpl(); // Per https://github.com/facebook/react/issues/4692#issuecomment-163029873


class Wrapper extends React.Component {
  render() {
    return React.createElement("div", null, this.props.children);
  }

}

describe('RecentFilesProvider', () => {
  beforeEach(() => {
    // $FlowIssue
    provider = Object.assign({}, _RecentFilesProvider().RecentFilesProvider);
    (0, _RecentFilesProvider().setRecentFilesService)(FakeRecentFilesService);
    jest.spyOn(atom.project, 'getPaths').mockImplementation(fakeGetProjectPaths);
  });
  describe('getRecentFiles', () => {
    it('returns all recently opened files for currently mounted project directories', async () => {
      if (!(provider != null)) {
        throw new Error("Invariant violation: \"provider != null\"");
      }

      fakeGetProjectPathsImpl = () => [PROJECT_PATH];

      if (!(provider.providerType === 'GLOBAL')) {
        throw new Error("Invariant violation: \"provider.providerType === 'GLOBAL'\"");
      }

      expect((await provider.executeQuery('', []))).toEqual(FAKE_RECENT_FILES);

      if (!(provider.providerType === 'GLOBAL')) {
        throw new Error("Invariant violation: \"provider.providerType === 'GLOBAL'\"");
      }

      fakeGetProjectPathsImpl = () => [PROJECT_PATH, PROJECT_PATH2];

      expect((await provider.executeQuery('', []))).toEqual(FAKE_RECENT_FILES);
    });
    it('does not return files for project directories that are not currently mounted', async () => {
      if (!(provider != null)) {
        throw new Error("Invariant violation: \"provider != null\"");
      }

      fakeGetProjectPathsImpl = () => [PROJECT_PATH2];

      if (!(provider.providerType === 'GLOBAL')) {
        throw new Error("Invariant violation: \"provider.providerType === 'GLOBAL'\"");
      }

      expect((await provider.executeQuery('', []))).toEqual([]);

      fakeGetProjectPathsImpl = () => [];

      if (!(provider.providerType === 'GLOBAL')) {
        throw new Error("Invariant violation: \"provider.providerType === 'GLOBAL'\"");
      }

      expect((await provider.executeQuery('', []))).toEqual([]);
    });
    it('does not return files that are currently open in Atom', async () => {
      if (!(provider != null)) {
        throw new Error("Invariant violation: \"provider != null\"");
      }

      fakeGetProjectPathsImpl = () => [PROJECT_PATH];

      const textEditor = await atom.workspace.open(FILE_PATHS[0]);

      if (!(provider.providerType === 'GLOBAL')) {
        throw new Error("Invariant violation: \"provider.providerType === 'GLOBAL'\"");
      }

      expect((await provider.executeQuery('', []))).toEqual([FAKE_RECENT_FILES[1], FAKE_RECENT_FILES[2]]);
      textEditor.destroy();

      if (!(provider.providerType === 'GLOBAL')) {
        throw new Error("Invariant violation: \"provider.providerType === 'GLOBAL'\"");
      }

      expect((await provider.executeQuery('', []))).toEqual(FAKE_RECENT_FILES);
    });
    it('filters results according to the query string', async () => {
      if (!(provider != null)) {
        throw new Error("Invariant violation: \"provider != null\"");
      }

      fakeGetProjectPathsImpl = () => [PROJECT_PATH]; // 'foo/bla/foo.js' does not match 'bba', but `bar.js` and `baz.js` do.


      if (!(provider.providerType === 'GLOBAL')) {
        throw new Error("Invariant violation: \"provider.providerType === 'GLOBAL'\"");
      }

      const results = await provider.executeQuery('bba', []); // Do not cement exact scores or match indices in this test, since they are determined by
      // Fuzzy-native. Jasmine 1.3 does not support `jasmine.objectContaining`,
      // so we need to check the results manually:

      expect(results.length).toEqual(2);
      expect(results[0].path).toEqual(FAKE_RECENT_FILES[1].path);
      expect(results[0].timestamp).toEqual(FAKE_RECENT_FILES[1].timestamp);
      expect(results[0].matchIndexes).toBeDefined();
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[1].path).toEqual(FAKE_RECENT_FILES[2].path);
      expect(results[1].timestamp).toEqual(FAKE_RECENT_FILES[2].timestamp);
      expect(results[1].matchIndexes).toBeDefined();
      expect(results[1].score).toBeGreaterThan(0);
    });
  });
  describe('Result rendering', () => {
    it('should render complete results', () => {
      const timestamp = Date.now();
      const mockResult = {
        resultType: 'FILE',
        path: '/some/arbitrary/path',
        timestamp
      };

      if (!(provider != null)) {
        throw new Error("Invariant violation: \"provider != null\"");
      }

      if (!(provider.getComponentForItem != null)) {
        throw new Error("Invariant violation: \"provider.getComponentForItem != null\"");
      }

      const reactElement = provider.getComponentForItem(mockResult);
      expect(reactElement.props.title).toEqual(new Date(mockResult.timestamp).toLocaleString());

      const renderedComponent = _testUtils().default.renderIntoDocument(React.createElement(Wrapper, null, reactElement));

      expect(_testUtils().default.scryRenderedDOMComponentsWithClass(renderedComponent, 'recent-files-provider-file-name').length).toBe(1);
      expect(_testUtils().default.scryRenderedDOMComponentsWithClass(renderedComponent, 'recent-files-provider-file-path').length).toBe(1);

      const datetimeLabels = _testUtils().default.scryRenderedDOMComponentsWithClass(renderedComponent, 'recent-files-provider-datetime-label');

      expect(datetimeLabels.length).toBe(1);
    });
    it('should render results with opacity according to their timestamp', () => {
      const now = Date.now();
      const HOURS = 60 * 60 * 1000;
      const DAYS = 24 * HOURS;

      if (!(provider != null)) {
        throw new Error("Invariant violation: \"provider != null\"");
      }

      if (!(provider.getComponentForItem != null)) {
        throw new Error("Invariant violation: \"provider.getComponentForItem != null\"");
      }

      expect(provider.getComponentForItem({
        resultType: 'FILE',
        path: '/some/arbitrary/path',
        timestamp: now
      }).props.style.opacity).toEqual(1);

      if (!(provider.getComponentForItem != null)) {
        throw new Error("Invariant violation: \"provider.getComponentForItem != null\"");
      }

      expect(provider.getComponentForItem({
        resultType: 'FILE',
        path: '/some/arbitrary/path',
        timestamp: now - 7 * HOURS
      }).props.style.opacity).toEqual(1);

      if (!(provider.getComponentForItem != null)) {
        throw new Error("Invariant violation: \"provider.getComponentForItem != null\"");
      }

      expect(provider.getComponentForItem({
        resultType: 'FILE',
        path: '/some/arbitrary/path',
        timestamp: now - 8 * HOURS
      }).props.style.opacity).not.toBeGreaterThan(1);

      if (!(provider.getComponentForItem != null)) {
        throw new Error("Invariant violation: \"provider.getComponentForItem != null\"");
      }

      expect(provider.getComponentForItem({
        resultType: 'FILE',
        path: '/some/arbitrary/path',
        timestamp: now - 10 * DAYS
      }).props.style.opacity).toEqual(0.6);
    });
  });
});