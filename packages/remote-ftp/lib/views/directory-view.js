'use babel';

import { Emitter, CompositeDisposable } from 'atom';
import path from 'path';
import { $, View } from 'atom-space-pen-views';
import { getIconHandler, checkTarget } from '../helpers';
import FileView from './file-view';

class DirectoryView extends View {
  static content() {
    return this.li({
      class: 'directory entry list-nested-item collapsed',
      is: 'tree-view-directory',
      draggable: true,
    }, () => {
      this.div({
        class: 'header list-item',
        outlet: 'header',
        is: 'tree-view-directory',
      }, () => this.span({
        class: 'name icon',
        outlet: 'name',
      }));
      this.ol({
        class: 'entries list-tree',
        outlet: 'entries',
      });
    });
  }

  initialize(directory) {
    // super.initialize(directory);

    this.moveTarget = null;
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();
    this.subsDrags = new CompositeDisposable();

    this.item = directory;
    this.name.text(this.item.name);
    this.name.attr('data-name', this.item.name);
    this.name.attr('data-path', this.item.remote);

    if (atom.project.remoteftp.checkIgnore(this.item.remote)) {
      this.addClass('status-ignored');
    }

    const addIconToElement = getIconHandler();
    if (addIconToElement) {
      const element = this.name[0] || this.name;
      const pathIco = this.item && this.item.local;

      if (typeof pathIco === 'undefined') return;

      this.iconDisposable = addIconToElement(element, pathIco, { isDirectory: true });
    } else {
      this.name.addClass(this.item.type && this.item.type === 'l' ? 'icon-file-symlink-directory' : 'icon-file-directory');
    }

    if (this.item.isExpanded || this.item.isRoot) { this.expand(); }

    if (this.item.isRoot) {
      this.addClass('project-root');
      // this.removeAttr('draggable');
      this.header.addClass('project-root-header');
      this.name.addClass('icon-server').removeClass('icon-file-directory');
    }

    // Trigger repaint
    this.triggers();

    this.repaint();

    // Events
    this.events();

    if (atom.config.get('remote-ftp.tree.enableDragAndDrop')) {
      this.dragEventsActivate();
    }
  }

  triggers() {
    this.subscriptions.add(
      this.item.onChangeSelect(() => {
        let lastSelected = atom.project.remoteftpMain.treeView.lastSelected;

        if (this.item.isSelected) {
          lastSelected.push(this);
          lastSelected = lastSelected.reverse().slice(0, 2).reverse();
        }
      }),
    );

    this.subscriptions.add(
      this.item.onChangeItems(() => {
        this.repaint();
      }),
    );

    this.subscriptions.add(
      this.item.onChangeExpanded(() => {
        this.setClasses();
      }),
    );

    this.subscriptions.add(
      this.item.onDestroyed(() => {
        this.destroy();
      }),
    );
  }

  onDidMouseDown(callback) {
    this.subscriptions.add(
      this.emitter.on('mousedown', (e) => {
        callback(e);
      }),
    );
  }

  onDidDbClick(callback) {
    this.subscriptions.add(
      this.emitter.on('dblclick', (e) => {
        callback(e);
      }),
    );
  }

  onDidChangeEnableDragAndDrop(callback) {
    this.subsDrags.add(
      this.emitter.on('enableDragAndDrop', () => {
        callback();
      }),
    );
  }

  onDidDrop(callback) {
    this.subsDrags.add(
      this.emitter.on('drop', (e) => {
        callback(e);
      }),
    );
  }

  onDidDragStart(callback) {
    this.subsDrags.add(
      this.emitter.on('dragstart', (e) => {
        callback(e);
      }),
    );
  }

  onDidDragOver(callback) {
    this.subsDrags.add(
      this.emitter.on('dragover', (e) => {
        callback(e);
      }),
    );
  }

  onDidDragEnter(callback) {
    this.subsDrags.add(
      this.emitter.on('dragenter', (e) => {
        callback(e);
      }),
    );
  }

  onDidDragLeave(callback) {
    this.subsDrags.add(
      this.emitter.on('dragleave', (e) => {
        callback(e);
      }),
    );
  }

  events() {
    this.on('dblclick', e => this.emitter.emit('dblclick', e));
    this.on('mousedown', e => this.emitter.emit('mousedown', e));

    this.onDidMouseDown((e) => {
      const self = e.currentTarget;
      e.stopPropagation();

      const view = $(self).view();
      const button = e.originalEvent ? e.originalEvent.button : 0;
      const selectKey = process.platform === 'darwin' ? 'metaKey' : 'ctrlKey'; // on mac the select key for multiple files is the meta key
      const $selected = $('.remote-ftp-view .selected');

      if (!view) return;

      if ((button === 0 || button === 2) && !(button === 2 && $selected.length > 1)) {
        if (!e[selectKey]) {
          $selected.removeClass('selected');
          $('.remote-ftp-view .entries.list-tree').removeClass('multi-select');
        } else {
          $('.remote-ftp-view .entries.list-tree').addClass('multi-select');
        }
        view.toggleClass('selected');

        this.item.setIsSelected = view.hasClass('selected');

        if (e.shiftKey) return;

        if (button === 0 && !e[selectKey]) {
          if (view.item.status === 0) {
            view.open();
            view.toggle();
          }

          view.toggle();
        }
      }
    });

    this.onDidDbClick((e) => {
      const self = e.currentTarget;
      e.stopPropagation();

      const view = $(self).view();

      if (!view) return;

      view.open();
    });
  }

  static actionRemoteMove(e, dataTransfer) {
    const ftp = atom.project.remoteftpMain;
    const pathInfos = JSON.parse(dataTransfer.getData('pathInfos'));
    const newPathInfo = DirectoryView.queryDataPath(e.currentTarget);
    const destPath = path.posix.join(newPathInfo, pathInfos.name);

    if (pathInfos.fullPath === '/' || pathInfos.fullPath === destPath) return;

    ftp.client.rename(pathInfos.fullPath, destPath, (err) => {
      if (err) console.error(err);
    });
  }

  static actionToRemote(e, dataTransfer) {
    const newPathInfo = DirectoryView.queryDataPath(e.currentTarget);
    const localPaths = JSON.parse(dataTransfer.getData('localPaths'));
    const destPath = path.posix.join(newPathInfo, localPaths.name);

    atom.project.remoteftpMain.client.uploadTo(localPaths.fullPath, destPath, (err) => {
      if (err) console.error(err);
    });
  }

  static queryDataPath(target) {
    return target.querySelector('span[data-path]').getAttribute('data-path');
  }

  dragEventsActivate() {
    this.on('drop', e => this.emitter.emit('drop', e));
    this.on('dragstart', e => this.emitter.emit('dragstart', e));
    this.on('dragover', e => this.emitter.emit('dragover', e));
    this.on('dragenter', e => this.emitter.emit('dragenter', e));
    this.on('dragleave', e => this.emitter.emit('dragleave', e));

    this.onDidDrop((e) => {
      e.preventDefault();
      e.stopPropagation();

      e.currentTarget.classList.remove('selected');

      if (!checkTarget(e)) return;
      if (this.moveTarget === e.currentTarget) return;

      const dataTransfer = e.originalEvent.dataTransfer;

      if (dataTransfer.getData('pathInfos').length !== 0) {
        DirectoryView.actionRemoteMove(e, dataTransfer);
      } else if (dataTransfer.getData('localPaths').length !== 0) {
        DirectoryView.actionToRemote(e, dataTransfer);
      }

      this.moveTarget = null;
    });

    this.onDidDragStart((e) => {
      this.moveTarget = e.currentTarget;

      const target = $(e.target).find('.name');
      const dataTransfer = e.originalEvent.dataTransfer;
      const pathInfos = {
        fullPath: target.data('path'),
        name: target.data('name'),
      };

      dataTransfer.setData('pathInfos', JSON.stringify(pathInfos));
      dataTransfer.effectAllowed = 'move';
    });

    this.onDidDragOver((e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.onDidDragEnter((e) => {
      const self = e.currentTarget;
      e.stopPropagation();

      if (!checkTarget(e)) return;

      self.classList.add('selected');
    });

    this.onDidDragLeave((e) => {
      e.stopPropagation();

      e.currentTarget.classList.remove('selected');
    });
  }

  dragEventsDestroy() {
    this.subsDrags.dispose();
  }

  dispose() {
    this.subscriptions.dispose();
    this.subsDrags.dispose();
    this.emitter.dispose();
  }

  destroy() {
    this.item = null;

    if (this.iconDisposable) {
      this.iconDisposable.dispose();
      this.iconDisposable = null;
    }

    this.dispose();
    this.remove();
  }

  getViews() {
    return this.entries.children().map((err, item) => $(item).view()).get();
  }

  getItemViews(itemViews) {
    const views = this.getViews() || itemViews;
    const entries = {
      folders: [],
      files: [],
    };

    if (this.item) {
      this.item.folders.forEach((item) => {
        for (let a = 0, b = views.length; a < b; ++a) {
          if (views[a] && views[a] instanceof DirectoryView && views[a].item === item) {
            entries.folders.push(views[a]);
            return;
          }
        }
        entries.folders.push(new DirectoryView(item));
      });

      this.item.files.forEach((item) => {
        for (let a = 0, b = views.length; a < b; ++a) {
          if (views[a] && views[a] instanceof FileView && views[a].item === item) {
            entries.files.push(views[a]);
            return;
          }
        }
        entries.files.push(new FileView(item));
      });
    }

    return entries;
  }

  repaint() {
    let views = this.getViews();

    this.entries.children().detach();

    const entries = this.getItemViews();

    // TODO Destroy left over...
    views = entries.folders.concat(entries.files);

    views.sort((a, b) => {
      if (a.constructor !== b.constructor) { return a instanceof DirectoryView ? -1 : 1; }
      if (a.item.name === b.item.name) { return 0; }

      return a.item.name.toLowerCase().localeCompare(b.item.name.toLowerCase());
    });

    views.forEach((view) => {
      this.entries.append(view);
    });
  }

  setClasses() {
    if (this.item.isExpanded) {
      this.addClass('expanded').removeClass('collapsed');
    } else {
      this.addClass('collapsed').removeClass('expanded');
    }
  }

  expand(recursive) {
    this.item.setIsExpanded = true;

    if (recursive) {
      this.entries.children().each((e, item) => {
        const view = $(item).view();
        if (view && view instanceof DirectoryView) { view.expand(true); }
      });
    }
  }

  collapse(recursive) {
    this.item.setIsExpanded = false;

    if (recursive) {
      this.entries.children().each((e, item) => {
        const view = $(item).view();
        if (view && view instanceof DirectoryView) { view.collapse(true); }
      });
    }
  }

  toggle(recursive) {
    if (this.item.isExpanded) {
      this.collapse(recursive);
    } else {
      this.expand(recursive);
    }
  }

  open() {
    this.item.open();
  }

  refresh() {
    this.item.open();
  }
}

export default DirectoryView;
