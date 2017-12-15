const {renderParameter, highlightCode, proFeatures, pluralize} = require('./html-utils');
const {detailNotEmpty, detailGet, detailLang, getFunctionDetails} = require('../utils');
const {callSignature} = require('../kite-data-utils');
const Plan = require('../plan');

function renderPatterns(data, title = 'Popular Patterns') {
  let patterns = '';
  const name = data.repr;
  const detail = getFunctionDetails(data);
  if (detail && detail.signatures && detail.signatures.length) {
    patterns = Plan.can('common_invocations_editor')
        ? `
          <section class="patterns">
          <h4>${title}</h4>
          <div class="section-content">${
            highlightCode(
              detail.signatures
              .map(s => callSignature(s))
              .map(s => `${name}(${s})`)
              .join('\n'))
            }</div>
          </section>`
        : `<section class="patterns">
            <h4>${title}</h4>
            <div class="section-content">
            ${proFeatures(
              `To see ${detail.signatures.length} ${
                pluralize(detail.signatures.length, 'pattern', 'patterns')
              }`
            )}</div>
          </section>`;
  }
  return patterns;
}

function renderLanguageSpecificArguments(value) {
  const {detail} = value;
  const lang = detailLang(detail);

  switch (lang) {
    case 'python':
      return renderKwargs(value);
    default:
      return '';
  }
}

function renderKwargs(data) {
  let kwargs = '';
  const detail = getFunctionDetails(data);
  if (detailNotEmpty(detail, 'kwarg_parameters')) {
    kwargs = `<section class="kwargs collapsible collapse">
        <h4>**${detailGet(detail, 'kwarg').name}</h4>
        <div class="section-content"><dl>
          ${
            detailGet(detail, 'kwarg_parameters')
            .map(p => renderParameter(p))
            .map(p => `<dt>${p}</dt>`)
            .join('')
          }
        </dl></div>
      </section>`;
  }
  return kwargs;
}

module.exports = { renderPatterns, renderLanguageSpecificArguments };
