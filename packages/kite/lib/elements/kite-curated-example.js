'use strict';

const {head, compact} = require('../utils');
const {openExampleInWebURL} = require('../urls');
const {section, renderExample, debugData} = require('./html-utils');

const {
  highlightChunk,
  wrapLine,
  wrapPre,
  splitByLine,
  escapeHTML,
} = require('../highlighter');

const refLink = (content, ref) =>
  `<a href="kite-atom-internal://value/python;${ref.fully_qualified}">${content}</a>`;

const processReferences = (line, references) => {
  const res = (references || []).reduce((o, ref) => {

    if (ref.begin >= o.start && ref.end <= o.end) {
      const prefix = o.remain.slice(0, ref.begin - o.start);
      const reference = o.remain.slice(ref.begin - o.start, ref.end - o.start);
      const postfix = o.remain.slice(ref.end - o.start);
      o.start = ref.end;
      o.remain = postfix;

      o.plain.push(highlightChunk(prefix));
      o.references.push(refLink(highlightChunk(reference), ref));
    }
    return o;
  }, {
    plain: [],
    references: [],
    remain: line.content,
    start: line.start,
    end: line.end,
  });

  return res.plain.map((p, i) => p + res.references[i]).join('') +
         highlightChunk(res.remain);
};

const wrapReferences = (lines, references) =>
  lines.map(line => processReferences(line, references));

const fileEntry = file =>
  `<li class='list-item'>
      <span class='icon icon-file-text'
            data-name="${file.name}">${file.name}</span>
  </li>`;

const isDir = l => l.mime_type === 'application/x-directory';

const dirEntry = dir => {
  const {listing} = dir;

  return `
  <li class='list-nested-item'>
    <div class='list-item'>
      <span class='icon icon-file-directory'
            data-name="${dir.name}">${dir.name}</span>
    </div>

    <ul class='list-tree'>${
      listing.map(l => isDir(l) ? dirEntry(l) : fileEntry(l)).join('')
    }</ul>
  </li>`;
};

const OUTPUTS = {
  image: part =>
    `<figure class="output">
      <figcaption class="list-item"><span class='icon icon-file-text'
                  data-name="${part.content.path}">${part.content.path}</span></figcaption>
      <img src="data:;base64,${part.content.data}" title="${part.content.path}">
    </figure>`,
  plaintext: part =>
    `<pre class="output"><code>${escapeHTML(part.content.value)}</code></pre>`,
  directory_listing_table: part => {
    const {caption, entries} = part.content;
    const columns = Object.keys(head(entries));

    return `
    <figure class="output">
      <figcaption>${caption}</figcaption>
      <table>
        <tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>
        ${
          entries.map(e => `<tr>${
            columns.map(c => `<td>${e[c]}</td>`).join('')
          }</tr>`).join('')
        }
      </table>
    </figure>`;
  },
  directory_listing_tree: part => {
    const {caption, entries} = part.content;

    return `
    <figure class="output">
      <figcaption>${caption}</figcaption>
      <ul class='list-tree root'>${dirEntry(entries)}</ul>
    </figure>`;
  },
  file: part =>
    `<figure class="output">
      <figcaption class="list-item"><span class='icon icon-file-text'
                  data-name="${part.content.caption}">${part.content.caption}</span></figcaption>
      <pre class="input"><code>${escapeHTML(atob(part.content.data))}</code></pre>
    </figure>`,
};

const INPUTS = [
  [
    p => p.mime_type === 'image/png',
    p => `<img src="data:;base64,${p.contents_base64}" title="${p.name}">`,
  ],
  [
    p => p.mime_type.indexOf('text/') !== -1,
    p => `<pre><code>${atob(p.contents_base64)}</code></pre>`,
  ],
  [
    p => true,
    p => '',
  ],
];

function processContent(content) {
  return wrapPre(
    wrapReferences(
      splitByLine(content.code),
      content.references
    ).map(wrapLine).join('')
  );
}


function processOutput(part) {
  return part.output_type && OUTPUTS[part.output_type]
    ? OUTPUTS[part.output_type](part)
    : `<pre><code>${JSON.stringify(part, null, 2)}</code></pre>`;
}

function processInput(part) {
  const [_, handler] = INPUTS.filter(([predicate]) => predicate(part))[0];
  return handler(part);
}

class KiteCuratedExample extends HTMLElement {
  static initClass() {
    return document.registerElement('kite-curated-example', {
      prototype: this.prototype,
    });
  }

  setData(data) {
    const html = data.prelude.concat(data.code).concat(data.postlude)
    .map(part => {
      if (part.type === 'code') {
        return processContent(part.content);
      } else if (part.type === 'output') {
        return processOutput(part);
      }

      return `<pre><code>${JSON.stringify(part, null, 2)}</code></pre>`;
    })
    .join('');
    const inputFiles = data.inputFiles;
    const inputHTML = inputFiles && inputFiles.length
      ? `<h5>Files used in this example</h5>
      ${inputFiles.map(f => {
        return `
        <figure class="input">
          <figcaption class="list-item">
            <span class='icon icon-file-text'
                  data-name="${f.name}">${f.name}</span>
          </figcaption>
          ${processInput(f)}
        </figure>`;
      }).join('')}
      `
      : '';

    const relatedHTML = data.related && data.related.length
      ? section('Related Examples', `
        <ul>${data.related.map(renderExample).join('')}</ul>`)
      : '';

    this.innerHTML = `
      <div class="example-wrapper">
        <div class="example-code">${html}</div>
        ${inputHTML}
        <div class="related-examples">${relatedHTML}</div>
      </div>
      ${debugData(data)}
      <footer>
        <div class="actions"></div>
        <kite-open-link data-url="${openExampleInWebURL(data.id)}"></kite-open-link>
      </footer>
    `;
  }
}

module.exports = KiteCuratedExample.initClass();
