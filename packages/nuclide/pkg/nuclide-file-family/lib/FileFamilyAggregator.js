'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _asyncToGenerator = _interopRequireDefault(require('async-to-generator'));

var _collection;

function _load_collection() {
  return _collection = require('nuclide-commons/collection');
}

var _UniversalDisposable;

function _load_UniversalDisposable() {
  return _UniversalDisposable = _interopRequireDefault(require('nuclide-commons/UniversalDisposable'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class FileFamilyAggregator {

  constructor(providers) {
    this._disposables = new (_UniversalDisposable || _load_UniversalDisposable()).default(providers.subscribe(providersValue => this._providers = providersValue));
  }

  dispose() {
    this._disposables.dispose();
  }

  getRelatedFiles(path) {
    var _this = this;

    return (0, _asyncToGenerator.default)(function* () {
      const allRelatedFiles = yield Promise.all([..._this._providers].map(function (provider) {
        return provider.getRelatedFiles(path);
      }));

      const allFiles = new Map();
      const directedAdjacencyMatrix = new Map();
      const undirectedAdjacencyMatrix = new Map();

      allRelatedFiles.forEach(function ({ files, relations }) {
        files.forEach(function (fileData, filePath) {
          return addRelatedFiletoFileMap(filePath, fileData, allFiles);
        });

        // Combine labels for all directed relations with identical from and to fields
        // Also combine labels for all undirected relations, regardless of from and to
        relations.forEach(function (relation) {
          if (relation.directed) {
            addRelationToAdjacencyMatrix(relation, directedAdjacencyMatrix);
          } else {
            const existingReverse = undirectedAdjacencyMatrix.get(relation.to);
            if (existingReverse != null && existingReverse.has(relation.from)) {
              const reverse = {
                from: relation.to,
                to: relation.from,
                labels: relation.labels,
                directed: relation.directed
              };
              addRelationToAdjacencyMatrix(reverse, undirectedAdjacencyMatrix);
            } else {
              addRelationToAdjacencyMatrix(relation, undirectedAdjacencyMatrix);
            }
          }
        });
      });

      const allRelations = [];
      directedAdjacencyMatrix.forEach(function (map) {
        return map.forEach(function (relation) {
          return allRelations.push(relation);
        });
      });
      undirectedAdjacencyMatrix.forEach(function (map) {
        return map.forEach(function (relation) {
          return allRelations.push(relation);
        });
      });

      return {
        files: allFiles,
        relations: allRelations
      };
    })();
  }
}

exports.default = FileFamilyAggregator; /**
                                         * Copyright (c) 2015-present, Facebook, Inc.
                                         * All rights reserved.
                                         *
                                         * This source code is licensed under the license found in the LICENSE file in
                                         * the root directory of this source tree.
                                         *
                                         * 
                                         * @format
                                         */

function addRelatedFiletoFileMap(filePath, fileData, fileMap) {
  const existingFileData = fileMap.get(filePath);
  if (existingFileData == null) {
    fileMap.set(filePath, fileData);
    return;
  }

  const newFileData = {};
  newFileData.labels = (0, (_collection || _load_collection()).setUnion)(existingFileData.labels, fileData.labels);
  if (existingFileData.exists != null || fileData.exists != null) {
    // We want to optimistically trust any provider that says the file exists
    // i.e., true > false > undefined
    newFileData.exists = Boolean(existingFileData.exists) || Boolean(fileData.exists);
  }
  if (existingFileData.creatable != null || fileData.creatable != null) {
    // We want to trust that any provider saying that a file is not creatable
    // knows what it's talking about
    // i.e., false > true > undefined
    newFileData.creatable = !(existingFileData.creatable === false || fileData.creatable === false);
  }
  fileMap.set(filePath, newFileData);
}

function addRelationToAdjacencyMatrix(relation, adjacencyMatrix) {
  const existingRelationFrom = adjacencyMatrix.get(relation.from);
  if (existingRelationFrom == null) {
    adjacencyMatrix.set(relation.from, new Map([[relation.to, relation]]));
    return;
  }
  const existingRelationTo = existingRelationFrom.get(relation.to);
  if (existingRelationTo == null) {
    existingRelationFrom.set(relation.to, relation);
    return;
  }
  // now we know that directed, from, and to are all equal
  const combinedRelation = {
    from: relation.from,
    to: relation.to,
    labels: (0, (_collection || _load_collection()).setUnion)(relation.labels, existingRelationTo.labels),
    directed: relation.directed
  };
  existingRelationFrom.set(relation.to, combinedRelation);
}