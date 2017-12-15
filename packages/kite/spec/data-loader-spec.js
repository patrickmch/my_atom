'use strict';

const url = require('url');
const md5 = require('md5');
const http = require('http');
const path = require('path');
const DataLoader = require('../lib/data-loader');
const {
  withKiteWhitelistedPaths, withRoutes, fakeResponse, withFakeServer,
} = require('./spec-helpers');

const projectPath = path.join(__dirname, 'fixtures');

describe('DataLoader', () => {
  let editor;
  beforeEach(() => {
    waitsForPromise(() => atom.workspace.open('sample.py').then(e => {
      editor = e;
    }));
  });

  describe('.getSupportedLanguages()', () => {
    withFakeServer([
      [
        o => o.path === '/clientapi/languages',
        o => fakeResponse(200, JSON.stringify(['javascript', 'python'])),
      ],
    ], () => {
      it('returns a promise that resolve with the supported languages', () => {
        waitsForPromise(() => DataLoader.getSupportedLanguages().then(languages => {
          expect(languages).toEqual(['javascript', 'python']);
        }));
      });
    });
  });

  withKiteWhitelistedPaths([projectPath], () => {
    describe('.getHoverDataAtRange()', () => {
      describe('when the request succeeds', () => {
        withRoutes([
          [
            o => /^\/api\/buffer\/atom/.test(o.path),
            o => fakeResponse(200, '{"foo": "bar"}'),
          ],
        ]);

        it('returns a promise that resolve with the returned data', () => {
          waitsForPromise(() => DataLoader.getHoverDataAtRange(editor, [[0, 0], [0, 6]]).then(data => {
            expect(http.request).toHaveBeenCalled();

            const editorHash = md5(editor.getText());
            const parsedURL = url.parse(http.request.mostRecentCall.args[0].path);

            expect(parsedURL.path.indexOf(editor.getPath().replace(/\//g, ':'))).not.toEqual(-1);
            expect(parsedURL.path.indexOf(editorHash)).not.toEqual(-1);
            const params = parseParams(parsedURL.query);


            expect(params.selection_begin_runes).toEqual('0');
            expect(params.selection_end_runes).toEqual('6');
            expect(data).toEqual({foo: 'bar'});
          }));
        });
      });

      describe('when the request fails', () => {
        withRoutes([
          [
            o => /^\/api\/buffer\/atom/.test(o.path),
            o => fakeResponse(404),
          ],
        ]);

        it('returns a rejected promise', () => {
          waitsForPromise({shouldReject: true}, () => DataLoader.getHoverDataAtRange(editor, [[0, 0], [0, 6]]));
        });
      });
    });

    describe('.getReportDataAtRange()', () => {
      describe('when the hover request succeeds but not the report request', () => {
        withRoutes([
          [
            o => /^\/api\/buffer\/atom/.test(o.path),
            o => fakeResponse(200, JSON.stringify({
              symbol: [{
                id: 'foo',
                value: [],
              }],
            })),
          ], [
            o => /^\/api\/editor\/symbol/.test(o.path),
            o => fakeResponse(404),
          ],
        ]);

        it('returns a promise that resolve with the returned hover data', () => {
          waitsForPromise(() => DataLoader.getReportDataAtRange(editor, [[0, 0], [0, 6]]).then(data => {
            expect(http.request).toHaveBeenCalled();

            const editorHash = md5(editor.getText());
            const parsedURL = url.parse(http.request.calls[0].args[0].path);

            expect(parsedURL.path.indexOf(editor.getPath().replace(/\//g, ':'))).not.toEqual(-1);
            expect(parsedURL.path.indexOf(editorHash)).not.toEqual(-1);
            const params = parseParams(parsedURL.query);

            expect(params.selection_begin_runes).toEqual('0');
            expect(params.selection_end_runes).toEqual('6');
            expect(data).toEqual([{
              symbol: [{
                id: 'foo',
                value: [],
              }],
            }]);
          }));
        });
      });

      describe('when both the hover request and the report request succeeds', () => {
        withRoutes([
          [
            o => /^\/api\/buffer\/atom/.test(o.path),
            o => fakeResponse(200, JSON.stringify({
              symbol: [{
                id: 'foo',
                value: [],
              }],
            })),
          ], [
            o => /^\/api\/editor\/symbol/.test(o.path),
            o => fakeResponse(200, '{"bar": "foo"}'),
          ],
        ]);

        it('returns a promise that resolve with both the returned report data', () => {
          waitsForPromise(() => DataLoader.getReportDataAtRange(editor, [[0, 0], [0, 6]]).then(data => {
            expect(http.request).toHaveBeenCalled();

            const parsedURL = url.parse(http.request.mostRecentCall.args[0].path);
            expect(parsedURL.path.indexOf('/foo')).not.toEqual(-1);

            expect(data).toEqual([
              {
                symbol: [{
                  id: 'foo',
                  value: [],
                }],
              },
              {bar: 'foo'},
            ]);
          }));
        });
      });

      describe('when the hover request fails', () => {
        withRoutes([
          [
            o => /^\/api\/buffer\/atom/.test(o.path),
            o => fakeResponse(404),
          ],
        ]);

        it('returns a rejected promise', () => {
          waitsForPromise({shouldReject: true}, () => DataLoader.getReportDataAtRange(editor, [[0, 0], [0, 6]]));
        });
      });
    });

    describe('.getValueReportDataForId()', () => {
      describe('when the request succeeds', () => {
        withRoutes([
          [
            o => /^\/api\/editor\/value/.test(o.path),
            o => fakeResponse(200, '{"foo": "bar"}'),
          ],
        ]);

        it('returns a promise that resolve with the returned hover data', () => {
          waitsForPromise(() => DataLoader.getValueReportDataForId('foo').then(data => {
            expect(http.request).toHaveBeenCalled();

            const parsedURL = url.parse(http.request.mostRecentCall.args[0].path);

            expect(parsedURL.path.indexOf('/foo')).not.toEqual(-1);

            expect(data).toEqual({foo: 'bar'});
          }));
        });
      });

      describe('when the request fails', () => {
        withRoutes([
          [
            o => /^\/api\/editor\/value/.test(o.path),
            o => fakeResponse(404),
          ],
        ]);

        it('returns a promise that is rejected', () => {
          waitsForPromise({shouldReject: true}, () => DataLoader.getValueReportDataForId('foo'));
        });
      });
    });

    describe('.getMembersDataForId()', () => {
      describe('when the request succeeds', () => {
        withRoutes([
          [
            o => /^\/api\/editor\/value\/[^\/]+\/members/.test(o.path),
            o => fakeResponse(200, '{"foo": "bar"}'),
          ],
        ]);

        it('returns a promise that resolve with the returned members data', () => {
          waitsForPromise(() => DataLoader.getMembersDataForId('foo').then(data => {
            expect(http.request).toHaveBeenCalled();

            const parsedURL = url.parse(http.request.calls[0].args[0].path);

            expect(parsedURL.path.indexOf('/foo')).not.toEqual(-1);

            expect(data).toEqual({foo: 'bar'});
          }));
        });
      });

      describe('when the request fails', () => {
        withRoutes([
          [
            o => /^\/api\/editor\/value\/[^\/]*\/members/.test(o.path),
            o => fakeResponse(404),
          ],
        ]);

        it('returns a promise that is rejected', () => {
          waitsForPromise({shouldReject: true}, () => DataLoader.getMembersDataForId('foo'));
        });
      });
    });

    describe('.getUsagesDataForValueId()', () => {
      describe('when the request succeeds', () => {
        withRoutes([
          [
            o => /^\/api\/editor\/value\/[^\/]+\/usages/.test(o.path),
            o => fakeResponse(200, '{"foo": "bar"}'),
          ],
        ]);

        it('returns a promise that resolve with the returned members data', () => {
          waitsForPromise(() => DataLoader.getUsagesDataForValueId('foo').then(data => {
            expect(http.request).toHaveBeenCalled();

            const parsedURL = url.parse(http.request.calls[0].args[0].path);

            expect(parsedURL.path.indexOf('/foo')).not.toEqual(-1);

            expect(data).toEqual({foo: 'bar'});
          }));
        });
      });

      describe('when the request fails', () => {
        withRoutes([
          [
            o => /^\/api\/editor\/value\/[^\/]*\/usages/.test(o.path),
            o => fakeResponse(404),
          ],
        ]);

        it('returns a promise that is rejected', () => {
          waitsForPromise({shouldReject: true}, () => DataLoader.getUsagesDataForValueId('foo'));
        });
      });
    });

    describe('.getUsageDataForId()', () => {
      describe('when the request succeeds', () => {
        withRoutes([
          [
            o => /^\/api\/editor\/usages/.test(o.path),
            o => fakeResponse(200, '{"foo": "bar"}'),
          ],
        ]);

        it('returns a promise that resolve with the returned usage data', () => {
          waitsForPromise(() => DataLoader.getUsageDataForId('foo').then(data => {
            expect(http.request).toHaveBeenCalled();

            const parsedURL = url.parse(http.request.calls[0].args[0].path);

            expect(parsedURL.path.indexOf('/foo')).not.toEqual(-1);

            expect(data).toEqual({foo: 'bar'});
          }));
        });
      });

      describe('when the request fails', () => {
        withRoutes([
          [
            o => /^\/api\/editor\/usages/.test(o.path),
            o => fakeResponse(404),
          ],
        ]);

        it('returns a promise that is rejected', () => {
          waitsForPromise({shouldReject: true}, () => DataLoader.getUsageDataForId('foo'));
        });
      });
    });

    describe('.getExampleDataForId()', () => {
      describe('when the request succeeds', () => {
        withRoutes([
          [
            o => /^\/api\/python\/curation/.test(o.path),
            o => fakeResponse(200, '{"foo": "bar"}'),
          ],
        ]);

        it('returns a promise that resolve with the returned example data', () => {
          waitsForPromise(() => DataLoader.getExampleDataForId('foo').then(data => {
            expect(http.request).toHaveBeenCalled();

            const parsedURL = url.parse(http.request.calls[0].args[0].path);

            expect(parsedURL.path.indexOf('/foo')).not.toEqual(-1);

            expect(data).toEqual({foo: 'bar'});
          }));
        });
      });

      describe('when the request fails', () => {
        withRoutes([
          [
            o => /^\/api\/python\/curation/.test(o.path),
            o => fakeResponse(404),
          ],
        ]);

        it('returns a promise that is rejected', () => {
          waitsForPromise({shouldReject: true}, () => DataLoader.getExampleDataForId('foo'));
        });
      });
    });
  });
});

function parseParams(queryString) {
  return queryString
    ? queryString.split('&').map(p => p.split('=')).reduce((m, [k, v]) => {
      m[k] = v;
      return m;
    }, {})
    : {};
}
