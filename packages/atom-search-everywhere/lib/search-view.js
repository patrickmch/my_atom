'use babel';
/** @jsx etch.dom */
/*
* decaffeinate suggestions:
* DS102: Remove unnecessary code created because of implicit returns
* DS206: Consider reworking classes to avoid initClass
* DS207: Consider shorter variations of null checks
* Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
*/
import path from 'path';
import escapeStringRegexp from 'escape-string-regexp';
import etch from 'etch';
import { BufferedProcess, CompositeDisposable } from 'atom';
import SelectListView from 'atom-select-list';
import Searcher from './searcher/searcher';
import config from './config';
import { openFile, getProjectPath, getWordUnderCursor } from './utils/tools';
import { RequestMerger } from './utils/utils';

/**
*  When the interval between two inputs is less than the threshold(The unit is ms),
* the previous input does not trigger a search to improve performance and interactivity
*/
const TRIGGER_THRESHOLD = 80;

export default class GrepView {
    constructor() {
        this.emptyMessage = "Search result is empty.";

        const requestMerger = new RequestMerger(TRIGGER_THRESHOLD,
            (querys) => this.searchAndRerender(querys.pop().data));
        this.selectListView = new SelectListView({
            items: [],
            // This property must be customized. The default filter function has a bug and will filter out Chinese.
            filter: (item) => item,
            filterQuery: (query) => query,
            didCancelSelection: () => this.cancel(),
            didConfirmSelection: (item) => this.onConfirm(item),
            didConfirmEmptySelection: () =>  this.onConfirm(),
            didChangeQuery: () => this.onChangeQuery(requestMerger),
            elementForItem: (item, { selected }) => this.renderItem(item, selected).element
        });
        this.selectListView.element.classList.add('atom-search-everywhere');

        this.subscriptions = new CompositeDisposable;
        this.subscriptions.add(atom.commands.add(
            this.selectListView.element, 'search-everywhere:pasteEscaped', (e) => this.onPasteEscaped(e)));
    }

    onChangeQuery(requestMerger) {
        let query = this.selectListView.getFilterQuery();
        // Be careful with infinite recursion
        if (query.length > config.inputThrottle) {
            query = query.slice(0, config.inputThrottle);
            this.selectListView.update({ query: query });
        }
        requestMerger.push(query);
    }

    onConfirm(item) {
        if (item) {
            openFile(item.fullPath, item.line, item.column);
        }
        this.cancel();
    }

    onPasteEscaped(e) {
        atom.commands.dispatch(e.target, "core:paste");
        let query = this.selectListView.getFilterQuery();
        if (config.escapeOnPaste) {
            query = escapeStringRegexp(query);
        }
        this.selectListView.update({ query: query });
    }

    renderItem(item, selected) {
        const rowContent = item.content.slice(0, 500);
        const reg = new RegExp(this.selectListView.getFilterQuery(), 'ig');
        const matched = reg.exec(rowContent);
        if (reg && matched) {
            item.contentSeg = [
                rowContent.slice(0, matched.index),
                matched[0],
                rowContent.slice(reg.lastIndex)
            ];
        } else {
            item.contentSeg = [rowContent];
        }
        return new ListItemComponent({
            item: item,
            showFullPath: config.showFullPath,
            selected: selected
        });
    }

    cancel() {
        this.isFileFiltering = false;
        // this.selectListView.reset();
        this.selectListView.update({ item: [] });
        this.hide();
        this.searcher && this.searcher.close();
    }

    searchAndRerender(query) {
         this.selectListView.update({
             items: [],
             loadingMessage: null,
             infoMessage: null,
             errorMessage: null,
             emptyMessage: null
         });

        if (config.minFilterLength && (query.length < config.minFilterLength)) {
            this.selectListView.update({ infoMessage: `Please enter more than ${config.minFilterLength} chars`, });
            return;
         }

        this.selectListView.update({ loadingMessage: "loading..." });
        this.searchProject(query, getProjectPath())
        .then((items) => {
            // console.log("Result:");
            // console.log(items);
            this.selectListView.update({
                items: items,
                loadingMessage: null,
                infoMessage: `Used searcher: ${this.searcher.searcherName}. `,
                emptyMessage: this.emptyMessage
            });

        }).catch((e) => {
            if (e.isExpired) {
                this.selectListView.update({
                    items: [],
                    infoMessage: `Used searcher: ${this.searcher.searcherName}. `,
                    loadingMessage: null,
                    errorMessage: "Error: " + e.error
                });
            }
        });
    }

    searchProject(query, projectPath) {
        this.searcher && this.searcher.close();
        this.searcher = Searcher.create(projectPath);
        const searcher = this.searcher;
        return this.searcher.search(query, projectPath)
        .catch((error) => {
            return Promise.reject({
                isExpired: this.searcher == searcher,
                error: error
            });
        })
        .then((result) => {
            if (this.searcher != searcher) {
                return Promise.reject({ isExpired: false });
            } else {
                return result;
            }
        });
    }

    destroy() {
        if (this.subscriptions != null) {
            this.subscriptions.dispose();
        }
        this.subscriptions = null;
    }

    show({ preserveLastSearch }) {
        this.previouslyFocusedElement = document.activeElement;
        if (!this.panel) {
            this.panel = atom.workspace.addModalPanel({item: this.selectListView});
        }
        if (!preserveLastSearch) {
            this.selectListView.update({ query: '' });
        } else {
            atom.commands.dispatch(atom.views.getView(this.selectListView.refs.queryEditor), "core:select-all");
        }
        this.panel.show();
        this.selectListView.focus();
    }

    hide() {
        if (this.panel) {
            this.panel.hide();
        }

        if (this.previouslyFocusedElement) {
            this.previouslyFocusedElement.focus();
            this.previouslyFocusedElement = null;
        }
    }

    togglePanel({ preserveLastSearch }) {
        if (this.panel && this.panel.isVisible()) {
            this.cancel();
        } else {
            this.show({ preserveLastSearch });
        }
    }

    toggle() {
        this.togglePanel({ preserveLastSearch: config.preserveLastSearch });
    }

    toggleLastSearch() {
        this.togglePanel({ preserveLastSearch: true });
    }

    toggleWordUnderCursor() {
        this.toggle({ preserveLastSearch: false });
        this.selectListView.update({ query: getWordUnderCursor() });
    }

}

class ListItemComponent {
  constructor (prop) {
      this.prop = prop;
      this.item = this.prop.item;
      etch.initialize(this);
  }

  render () {
      const c1 = this.item.contentSeg[0];
      const c2 = this.item.contentSeg[1] || '';
      const c3 = this.item.contentSeg[2] || '';
      const displayedPath = this.prop.showFullPath ? this.item.filePath : path.basename(this.item.filePath);

      return (
          <li class="two-lines">
          <div class="primary-line file icon icon-file-text" data-name={displayedPath}>
          {displayedPath}:{this.item.line + 1}
          </div>
          <div class={"secondary-line " + (this.prop.selected ? "selected" : "") }>
          <span class="normal-search">{c1}</span>
          <span class="matched-search">{c2}</span>
          <span class="normal-search">{c3}</span>
          </div>
          </li>
      );
  }

  update (props, children) {
      return etch.update(this);
  }
}
