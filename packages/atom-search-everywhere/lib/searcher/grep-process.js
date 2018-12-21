'use babel';
import { BufferedProcess } from 'atom';
import path from 'path';
import hasbin from 'hasbin';
import config from '../config';

export default class GrepProcess {
    constructor({commandArgs, cwd, env, parseLine}) {
        let command, args;
        [command, ...args] = commandArgs;
        this.command = command;
        this.args = args;
        this.parseLine = parseLine;
        this.process = null;

        this.options = {
            cwd: cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: env
        };
    }

    run() {
        if (!hasbin.sync(this.command)) {
            return Promise.reject(
                `The command ${this.command} does not exist in the system. Please try again after installation.`);
        }

        return new Promise((resolve, reject) => {
            let listItems = [];
            let errorMessage = "";
            this.process = new BufferedProcess({
                command: this.command,
                args: this.args,
                options: this.options,
                stdout: (output) => {
                    listItems = listItems.concat(this.parseOutput(output));
                    if (listItems.length > config.maxCandidates) {
                        this.destroy();
                        resolve(listItems);
                    }
                },
                stderr: (error) => {
                    errorMessage = error;
                },
                exit: (code) => {
                    if (code == 0 || code == 1) {
                        resolve(listItems);
                    } else {
                        reject(errorMessage);
                    }
                }
            });
        });
    }

    parseOutput(output) {
        return output.split(/\n/)
        .filter(line => line.trim())
        .map((line) => this.parseLine(line));
    }

    destroy() {
        if (this.process) {
            this.process.kill();
        }
    }
}
