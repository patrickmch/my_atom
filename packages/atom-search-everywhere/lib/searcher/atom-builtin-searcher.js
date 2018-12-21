'use babel';
import config from '../config';

/**
* Thanks for:
* 1. https://discuss.atom.io/t/how-to-import-and-use-directorysearch-in-atom/19205
* 2. https://github.com/atom/find-and-replace/blob/master/lib/project/results-model.js#L175
* 3. https://github.com/atom/atom/blob/v1.5.0/src/workspace.coffee#L943
*/
export default class AtomBuiltinSearcher {
    constructor(isGitGrep, opts = {}) {
        this.env = opts.env || process.env;
        this.grepProcess = null;

        this.isGitGrep = isGitGrep;
    }

    isSupported(projectPath) {
        return true;
    }

    search(search, projectPath) {
        const projectDirectory = atom.workspace.project.getDirectoryForProjectPath(projectPath);
        const regExp = new RegExp(search, 'gi');
        let listItems = [];
        return new Promise((resolve, reject) => {
            this.inProgressSearchPromise = atom.workspace.defaultDirectorySearcher
            .search([projectDirectory], regExp, {
                inclusions: [],
                includeHidden: true,
                excludeVcsIgnores: atom.config.get('core.excludeVcsIgnoredPaths'),
                exclusions: atom.config.get('core.ignoredNames'),
                follow: atom.config.get('core.followSymlinks'),
                didSearchPaths: (count) => {},

                didMatch: (result) => {
                    if (!atom.workspace.project.isPathModified(result.filePath)) {
                        if (listItems.length > config.maxCandidates) {
                            this.close();
                            return;
                        }
                        listItems = listItems.concat(this.toItems(result));
                    }
                },
                didError: (error) => reject(error)
            });
            this.inProgressSearchPromise.then(() => {
                resolve(listItems);
            });
        });
    }

    toItems(result) {
        // console.log(result);
        return result.matches.map((match) => {
            return {
                filePath: result.filePath,
                fullPath: result.filePath,
                line: match.range[0][0],
                column: match.range[0][1],
                content: match.lineText
            };
        });
    }

    close() {
        if (this.inProgressSearchPromise) {
            this.inProgressSearchPromise.cancel();
        }
    }

}
