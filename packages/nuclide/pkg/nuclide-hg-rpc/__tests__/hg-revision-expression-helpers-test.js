"use strict";

function _hgRevisionExpressionHelpers() {
  const data = require("../lib/hg-revision-expression-helpers");

  _hgRevisionExpressionHelpers = function () {
    return data;
  };

  return data;
}

function _hgConstants() {
  const data = require("../lib/hg-constants");

  _hgConstants = function () {
    return data;
  };

  return data;
}

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
describe('hg-revision-expression-helpers', () => {
  describe('expressionForRevisionsBeforeHead', () => {
    it('returns a correct expression <= 0 revisions before head.', () => {
      expect((0, _hgRevisionExpressionHelpers().expressionForRevisionsBeforeHead)(0)).toBe('.');
      expect((0, _hgRevisionExpressionHelpers().expressionForRevisionsBeforeHead)(-2)).toBe('.');
    });
    it('returns a correct expression for > 0 revisions before head.', () => {
      expect((0, _hgRevisionExpressionHelpers().expressionForRevisionsBeforeHead)(3)).toBe('.~3');
    });
  });
  describe('parseRevisionInfoOutput', () => {
    it('returns the parsed revision info if is valid.', () => {
      const commit1Description = `Commit 1 'title'.
Continue Commit 1 message.`;
      const commit2Description = `Commit 2 'title'.

Still, multi-line commit 2 message

Test Plan: complete`;
      const revisionsString = `124
Commit 1 'title'.
Author Name<auth_2_alias@domain.com>
2015-10-15 16:03 -0700
a343fb3
default
draft
b-1${_hgRevisionExpressionHelpers().NULL_CHAR}b-2${_hgRevisionExpressionHelpers().NULL_CHAR}

tip${_hgRevisionExpressionHelpers().NULL_CHAR}
a343fb211111${_hgRevisionExpressionHelpers().NULL_CHAR}000000000000${_hgRevisionExpressionHelpers().NULL_CHAR}
@
["temp.txt"]







${commit1Description}
${_hgRevisionExpressionHelpers().INFO_REV_END_MARK}
123
Commit 2 'title'.
Author Name<auth_2_alias@domain.com>
2015-10-15 16:02 -0700
a343fb2
default
public

remote/master${_hgRevisionExpressionHelpers().NULL_CHAR}

abc123411111${_hgRevisionExpressionHelpers().NULL_CHAR}000000000000${_hgRevisionExpressionHelpers().NULL_CHAR}

["temp.txt"]

af3435454321





${commit2Description}
${_hgRevisionExpressionHelpers().INFO_REV_END_MARK}
`;
      expect((0, _hgRevisionExpressionHelpers().parseRevisionInfoOutput)(revisionsString)).toEqual([{
        id: 124,
        isHead: true,
        files: ['temp.txt'],
        title: "Commit 1 'title'.",
        author: 'Author Name<auth_2_alias@domain.com>',
        hash: 'a343fb3',
        bookmarks: ['b-1', 'b-2'],
        remoteBookmarks: [],
        date: new Date('2015-10-15 16:03 -0700'),
        branch: 'default',
        phase: 'draft',
        tags: ['tip'],
        parents: ['a343fb211111'],
        description: commit1Description,
        successorInfo: null
      }, {
        id: 123,
        isHead: false,
        files: ['temp.txt'],
        title: "Commit 2 'title'.",
        author: 'Author Name<auth_2_alias@domain.com>',
        hash: 'a343fb2',
        bookmarks: [],
        remoteBookmarks: ['remote/master'],
        date: new Date('2015-10-15 16:02 -0700'),
        branch: 'default',
        phase: 'public',
        tags: [],
        parents: ['abc123411111'],
        description: commit2Description,
        successorInfo: {
          hash: 'af3435454321',
          type: _hgConstants().SuccessorType.AMEND
        }
      }]);
    });
    it('skips an entry if invalid - should never happen', () => {
      expect((0, _hgRevisionExpressionHelpers().parseRevisionInfoOutput)('revision:123')).toEqual([]);
    });
  });
  describe('parseSuccessorData', () => {
    it('handles multiple successors', () => {
      expect((0, _hgRevisionExpressionHelpers().parseSuccessorData)(['', '', '', '', '', '', '111111111111, 222222222222, 333333333333'])).toEqual({
        hash: '111111111111',
        type: _hgConstants().SuccessorType.REWRITTEN
      });
    });
    it('uses rewritten last', () => {
      expect((0, _hgRevisionExpressionHelpers().parseSuccessorData)(['', '', '', '444444444444', '', '', '111111111111'])).toEqual({
        hash: '444444444444',
        type: _hgConstants().SuccessorType.SPLIT
      });
    });
  });
});