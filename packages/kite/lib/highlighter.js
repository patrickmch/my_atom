'use strict';
const _ = require('underscore-plus');
const {last} = require('./utils');

const escapeHTML = str =>
  str
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const wrapLine = str => `<div class="line">${str}</div>`;

const wrapPre = str => `<pre class="editor editor-colors">${str}</pre>`;

const splitByLine = str => str.split('\n').reduce((m, l, i) => {
  return m.concat({
    start: last(m) ? last(m).end + 1 : 0,
    end: last(m) ? last(m).end + 1 + l.length : l.length,
    content: l,
    line: i,
  });
}, []);

const escapeString = (string) => {
  return string.replace(/[&"'<> ]/g, (match) => {
    switch (match) {
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      // case ' ': return '&nbsp;';
      default: return match;
    }
  });
};

const updateScopeStack = (scopeStack, desiredScopes, html) => {
  let i;
  let excessScopes = scopeStack.length - desiredScopes.length;
  if (excessScopes > 0) {
    while (excessScopes--) { html = popScope(scopeStack, html); }
  }

  // pop until common prefix
  for (i = scopeStack.length, asc = scopeStack.length <= 0; asc ? i <= 0 : i >= 0; asc ? i++ : i--) {
    var asc;
    if (_.isEqual(scopeStack.slice(0, i), desiredScopes.slice(0, i))) { break; }
    html = popScope(scopeStack, html);
  }

  // push on top of common prefix until scopeStack is desiredScopes
  for (let j = i, end = desiredScopes.length, asc1 = i <= end; asc1 ? j < end : j > end; asc1 ? j++ : j--) {
    html = pushScope(scopeStack, desiredScopes[j], html);
  }

  return html;
};

const scopePrefix = 'syntax--';

const pushScope = (scopeStack, scope, html) => {
  scopeStack.push(scope);
  if (scope) {
    let className = scopePrefix + scope.replace(/\.+/g, ` ${scopePrefix}`);
    return html += `<span class=\"${className}\">`;
  } else {
    return html += '<span>';
  }
};

const popScope = (scopeStack, html) => {
  scopeStack.pop();
  return html += '</span>';
};

const highlights = ({fileContents, scopeName}) => {
  const grammar = atom.grammars.grammarForScopeName(scopeName);

  const lineTokens = grammar.tokenizeLines(fileContents);

  if (lineTokens.length > 0) {
    const lastLineTokens = lineTokens[lineTokens.length - 1];

    if ((lastLineTokens.length === 1) && (lastLineTokens[0].value === '')) {
      lineTokens.pop();
    }
  }

  let html = '';
  for (let tokens of Array.from(lineTokens)) {
    let scopeStack = [];
    for (let {value, scopes} of Array.from(tokens)) {
      if (!value) { value = ' '; }
      html = updateScopeStack(scopeStack, scopes, html);
      html += `<span>${escapeString(value)}</span>`;
    }
    while (scopeStack.length > 0) { html = popScope(scopeStack, html); }
  }

  return html;
};

const highlightChunk = (chunk) =>
  highlights({
    fileContents: chunk,
    scopeName: 'source.python',
  });

module.exports = {
  escapeHTML,
  highlightChunk,
  highlights,
  splitByLine,
  wrapLine,
  wrapPre,
};
