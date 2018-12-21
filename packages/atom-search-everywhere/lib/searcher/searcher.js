'use babel';
import config from '../config';
import GrepSearcher from './grep-searcher';
import AtomBuiltinSearcher from './atom-builtin-searcher';

export default class Searcher {
    static create(projectPath) {
        const searchers = {
            "gitgrep": new GrepSearcher(true),
            "grep": new GrepSearcher(false),
            "builtin": new AtomBuiltinSearcher()
        };

        const result = config.searcherPriority
        .map((name) => {
            return {
                name: name,
                searcher: searchers[name]
            };
        })
        .find(({name, searcher}) => searcher.isSupported(projectPath));

        result.searcher.searcherName = result.name;
        return result.searcher;
    }
}
