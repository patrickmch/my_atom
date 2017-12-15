'use strict';
const md5 = require('md5');
const {Range} = require('atom');
const {head} = require('./utils');

function tokensPath(editor) {
  const state = md5(editor.getText());
  const filename = editor.getPath();
  const buffer = cleanPath(filename);
  return `/api/buffer/atom/${buffer}/${state}/tokens`;
}

function languagesPath() {
  return '/clientapi/languages';
}

function metricsCounterPath() {
  return '/clientapi/metrics/counters';
}

function accountPath() {
  return '/api/account/user';
}

function signaturePath() {
  return '/clientapi/editor/signatures';
}

function searchPath(query, offset = 0, limit = 10) {
  return [
    '/api/search',
    [
      `q=${encodeURI(query)}`,
      `offset=${offset}`,
      `limit=${limit}`,
    ].join('&'),
  ].join('?');
}

function projectDirPath(path) {
  return [
    '/clientapi/projectdir',
    `filename=${encodeURI(path)}`,
  ].join('?');
}

function shouldNotifyPath(path) {
  return [
    '/clientapi/permissions/notify',
    `filename=${encodeURI(path)}`,
  ].join('?');
}

function completionsPath() {
  return '/clientapi/editor/completions';
}

function statusPath(path) {
  return [
    '/clientapi/status',
    `filename=${encodeURI(path)}`,
  ].join('?');
}

function reportPath(data) {
  const value = head(head(data.symbol).value);

  return valueReportPath(value.id);
}

function valueReportPath(id) {
  return `/api/editor/value/${id}`;
}

function symbolReportPath(id) {
  return `/api/editor/symbol/${id}`;
}

function membersPath(id, page = 0, limit = 999) {
  return [
    `/api/editor/value/${id}/members`,
    [
      `offset=${page}`,
      `limit=${limit}`,
    ].join('&'),
  ].join('?');
}

function usagesPath(id, page = 0, limit = 999) {
  return [
    `/api/editor/value/${id}/usages`,
    [
      `offset=${page}`,
      `limit=${limit}`,
    ].join('&'),
  ].join('?');
}

function usagePath(id) {
  return `/api/editor/usages/${id}`;
}

function examplePath(id) {
  return `/api/python/curation/${id}`;
}

function openDocumentationInWebURL(id) {
  return `http://localhost:46624/clientapi/desktoplogin?d=/docs/${escapeId(id)}`;
}

function openSignatureInWebURL(id) {
  return `http://localhost:46624/clientapi/desktoplogin?d=/docs/${escapeId(id)}%23signature`;
}

function openExampleInWebURL(id) {
  return `http://localhost:46624/clientapi/desktoplogin?d=/examples/python/${escapeId(id)}`;
}

function hoverPath(editor, range) {
  range = Range.fromObject(range);

  const state = md5(editor.getText());
  const filename = editor.getPath();
  const buffer = cleanPath(filename);
  const start = editor.getBuffer().characterIndexForPosition(range.start);
  const end = editor.getBuffer().characterIndexForPosition(range.end);
  return [
    `/api/buffer/atom/${buffer}/${state}/hover`,
    [
      `selection_begin_runes=${start}`,
      `selection_end_runes=${end}`,
    ].join('&'),
  ].join('?');
}

function escapeId(id) {
  return encodeURI(String(id)).replace(/;/g, '%3B');
}

function cleanPath(p) {
  return encodeURI(p)
  .replace(/^([A-Z]):/, '/windows/$1')
  .replace(/\/|\\|%5C/g, ':');
}

function internalURL(path) {
  return `kite-atom-internal://${path}`;
}

function internalGotoURL(def) {
  return internalURL(`goto/${encodeURI(def.filename)}:${def.line}`);
}

function internalGotoIdURL(id) {
  return internalURL(`goto-id/${id}`);
}

function internalExpandURL(id) {
  return internalURL(`expand/${id}`);
}

function internalExpandRangeURL(range) {
  return internalURL(`expand-range/${serializeRangeForPath(range)}`);
}

function internalGotoRangeURL(range) {
  return internalURL(`goto-range/${serializeRangeForPath(range)}`);
}

function internalOpenRangeInWebURL(range) {
  return internalURL(`open-range/${serializeRangeForPath(range)}`);
}

function serializeRangeForPath(range) {
  return `${range.start.row}:${range.start.column}/${range.end.row}:${range.end.column}`;
}

module.exports = {
  accountPath,
  completionsPath,
  examplePath,
  hoverPath,
  internalExpandRangeURL,
  internalExpandURL,
  internalGotoIdURL,
  internalGotoRangeURL,
  internalGotoURL,
  internalOpenRangeInWebURL,
  internalURL,
  languagesPath,
  membersPath,
  openDocumentationInWebURL,
  openExampleInWebURL,
  openSignatureInWebURL,
  projectDirPath,
  reportPath,
  searchPath,
  serializeRangeForPath,
  shouldNotifyPath,
  signaturePath,
  statusPath,
  symbolReportPath,
  tokensPath,
  usagePath,
  usagesPath,
  valueReportPath,
  metricsCounterPath,
};
