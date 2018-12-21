'use babel';
import { BufferedProcess } from 'atom';
import hasbin from 'hasbin';
import { isGitRepo } from '../utils/tools';
import config from '../config';
import GrepProcess from './grep-process';

export default class GrepSearcher {
    constructor(isGitGrep, opts = {}) {
        this.env = opts.env || process.env;
        this.grepProcess = null;

        this.isGitGrep = isGitGrep;
    }

    get commandString() {
        return this.isGitGrep ? config.gitGrepCommandString : config.grepCommandString;
    }

    isSupported(rootPath) {
        if (this.isGitGrep) {
            return hasbin.sync("git") && isGitRepo(rootPath);
        } else {
            let command = this.commandString.split(/\s/)[0];
            return hasbin.sync(command);
        }
    }

    search(search, rootPath) {
        this.close();

        const isColumnArg = this.detectColumnFlag(this.commandString);
        let commandArgs = this.commandString.split(/\s/).concat([search]);

        this.grepProcess = new GrepProcess({
            commandArgs: commandArgs,
            cwd: rootPath,
            env: this.env,
            parseLine: (lineContext) => {
                const contentRegexp = isColumnArg ? /^(\d+):\s*/ : /^\s+/;
                let path, line, content;
                [path, line, ...content] = lineContext.split(':');
                content = content.join(':');
                return {
                    filePath: path,
                    fullPath: rootPath + '/' + path,
                    line: line - 1,
                    column: this.getColumn(isColumnArg, search, content),
                    content: content.replace(contentRegexp, '')
                };
            }
        });
        return this.grepProcess.run();
    }

    detectColumnFlag(commandString) {
        return /(ag|pt|ack|rg)$/.test(commandString.split(/\s/)[0])
        && commandString.indexOf('--column');
    }

    close() {
        if (this.grepProcess) {
            this.grepProcess.destroy();
        }
    }

    getColumn(isColumnArg, search, content) {
        if (isColumnArg) {
            const match = content.match(/^(\d+):/);
            return match ? match[1] - 1 : 0;
        } else {
            const match = content.match(new RegExp(search, 'gi'));
            return match ? content.indexOf(match[0]) : 0;
        }
    }
}
