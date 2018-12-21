'use babel';
import SearchView from './search-view';

class Plugin {
    constructor() {
        this.searchView = new SearchView();
        this.commandSubscription = atom.commands.add('atom-workspace', {
            'search-everywhere:toggle': () => this.searchView.toggle(),
            'search-everywhere:toggleLastSearch': () => this.searchView.toggleLastSearch(),
            'search-everywhere:toggleWordUnderCursor': () => this.searchView.toggleWordUnderCursor()
        });
    }

    deactivate() {
        this.commandSubscription && this.commandSubscription.dispose();
        this.searchView && this.searchView.destroy();
    }
};

let plugin;
module.exports = {
    activate() {
        if (!plugin) {
            plugin = new Plugin();
        }
    },

    deactivate() {
        plugin.deactivate();
        plugin = null;
    }
};
