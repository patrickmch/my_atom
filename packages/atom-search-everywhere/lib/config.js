'use babel';

class Config {
    constructor() {
    }

    get minFilterLength() {
        return atom.config.get('atom-search-everywhere.minSymbolsToStartSearch');
    }

    get maxCandidates() {
        return atom.config.get('atom-search-everywhere.maxCandidates');
    }
    get preserveLastSearch() {
        return atom.config.get('atom-search-everywhere.preserveLastSearch');
    }

    get escapeSelectedText() { // TODO
        return atom.config.get('atom-search-everywhere.escapeSelectedText');
    }

    get showFullPath() {
        return atom.config.get('atom-search-everywhere.showFullPath');
    }

    get inputThrottle() {
        return atom.config.get('atom-search-everywhere.inputThrottle');
    }

    get escapeOnPaste() {
        return atom.config.get('atom-search-everywhere.escapeOnPaste');
    }

    get searcherPriority() {
        return atom.config.get('atom-search-everywhere.searcherPriority');
    }

    get gitGrepCommandString() {
        return atom.config.get('atom-search-everywhere.gitGrepCommandString');
    }

    get grepCommandString() {
        return atom.config.get('atom-search-everywhere.grepCommandString');
    }
}

const config = new Config();
export default config;
