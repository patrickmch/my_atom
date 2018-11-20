// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:max-func-body-length no-any no-conditional-assignment no-increment-decrement no-invalid-this insecure-random
const assert_1 = require("assert");
const chai_1 = require("chai");
const child_process_1 = require("child_process");
const path = require("path");
const typeMoq = require("typemoq");
const enumUtils_1 = require("../../client/common/enumUtils");
const types_1 = require("../../client/common/types");
const argumentsHelper_1 = require("../../client/unittests/common/argumentsHelper");
const argsService_1 = require("../../client/unittests/nosetest/services/argsService");
const argsService_2 = require("../../client/unittests/pytest/services/argsService");
const types_2 = require("../../client/unittests/types");
const argsService_3 = require("../../client/unittests/unittest/services/argsService");
const common_1 = require("../common");
suite('Unit Tests - argsService', () => {
    [types_1.Product.unittest, types_1.Product.nosetest, types_1.Product.pytest]
        .forEach(product => {
        const productNames = enumUtils_1.EnumEx.getNamesAndValues(types_1.Product);
        const productName = productNames.find(item => item.value === product).name;
        suite(productName, () => {
            let argumentsService;
            let moduleName = '';
            let expectedWithArgs = [];
            let expectedWithoutArgs = [];
            suiteSetup(() => {
                const serviceContainer = typeMoq.Mock.ofType();
                const logger = typeMoq.Mock.ofType();
                serviceContainer
                    .setup(s => s.get(typeMoq.It.isValue(types_1.ILogger), typeMoq.It.isAny()))
                    .returns(() => logger.object);
                const argsHelper = new argumentsHelper_1.ArgumentsHelper(serviceContainer.object);
                serviceContainer
                    .setup(s => s.get(typeMoq.It.isValue(types_2.IArgumentsHelper), typeMoq.It.isAny()))
                    .returns(() => argsHelper);
                switch (product) {
                    case types_1.Product.unittest: {
                        argumentsService = new argsService_3.ArgumentsService(serviceContainer.object);
                        moduleName = 'unittest';
                        break;
                    }
                    case types_1.Product.nosetest: {
                        argumentsService = new argsService_1.ArgumentsService(serviceContainer.object);
                        moduleName = 'nose';
                        break;
                    }
                    case types_1.Product.pytest: {
                        moduleName = 'pytest';
                        argumentsService = new argsService_2.ArgumentsService(serviceContainer.object);
                        break;
                    }
                    default: {
                        throw new Error('Unrecognized Test Framework');
                    }
                }
                expectedWithArgs = getOptions(product, moduleName, true);
                expectedWithoutArgs = getOptions(product, moduleName, false);
            });
            test('Check for new/unrecognized options with values', () => {
                const options = argumentsService.getKnownOptions();
                const optionsNotFound = expectedWithArgs.filter(item => options.withArgs.indexOf(item) === -1);
                if (optionsNotFound.length > 0) {
                    assert_1.fail('', optionsNotFound.join(', '), 'Options not found');
                }
            });
            test('Check for new/unrecognized options without values', () => {
                const options = argumentsService.getKnownOptions();
                const optionsNotFound = expectedWithoutArgs.filter(item => options.withoutArgs.indexOf(item) === -1);
                if (optionsNotFound.length > 0) {
                    assert_1.fail('', optionsNotFound.join(', '), 'Options not found');
                }
            });
            test('Test getting value for an option with a single value', () => {
                for (const option of expectedWithArgs) {
                    const args = ['--some-option-with-a-value', '1234', '--another-value-with-inline=1234', option, 'abcd'];
                    const value = argumentsService.getOptionValue(args, option);
                    chai_1.expect(value).to.equal('abcd');
                }
            });
            test('Test getting value for an option with a multiple value', () => {
                for (const option of expectedWithArgs) {
                    const args = ['--some-option-with-a-value', '1234', '--another-value-with-inline=1234', option, 'abcd', option, 'xyz'];
                    const value = argumentsService.getOptionValue(args, option);
                    chai_1.expect(value).to.deep.equal(['abcd', 'xyz']);
                }
            });
            test('Test getting the test folder in unittest with -s', function () {
                if (product !== types_1.Product.unittest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const args = ['anzy', '--one', '--three', '-s', dir];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(1);
                chai_1.expect(testDirs[0]).to.equal(dir);
            });
            test('Test getting the test folder in unittest with -s in the middle', function () {
                if (product !== types_1.Product.unittest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const args = ['anzy', '--one', '--three', '-s', dir, 'some other', '--value', '1234'];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(1);
                chai_1.expect(testDirs[0]).to.equal(dir);
            });
            test('Test getting the test folder in unittest with --start-directory', function () {
                if (product !== types_1.Product.unittest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const args = ['anzy', '--one', '--three', '--start-directory', dir];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(1);
                chai_1.expect(testDirs[0]).to.equal(dir);
            });
            test('Test getting the test folder in unittest with --start-directory in the middle', function () {
                if (product !== types_1.Product.unittest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const args = ['anzy', '--one', '--three', '--start-directory', dir, 'some other', '--value', '1234'];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(1);
                chai_1.expect(testDirs[0]).to.equal(dir);
            });
            test('Test getting the test folder in nosetest', function () {
                if (product !== types_1.Product.nosetest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const args = ['anzy', '--one', '--three', dir];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(1);
                chai_1.expect(testDirs[0]).to.equal(dir);
            });
            test('Test getting the test folder in nosetest (with multiple dirs)', function () {
                if (product !== types_1.Product.nosetest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const dir2 = path.join('a', 'b', '2');
                const args = ['anzy', '--one', '--three', dir, dir2];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(2);
                chai_1.expect(testDirs[0]).to.equal(dir);
                chai_1.expect(testDirs[1]).to.equal(dir2);
            });
            test('Test getting the test folder in pytest', function () {
                if (product !== types_1.Product.pytest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const args = ['anzy', '--one', '--rootdir', dir];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(1);
                chai_1.expect(testDirs[0]).to.equal(dir);
            });
            test('Test getting the test folder in pytest (with multiple dirs)', function () {
                if (product !== types_1.Product.pytest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const dir2 = path.join('a', 'b', '2');
                const args = ['anzy', '--one', '--rootdir', dir, '--rootdir', dir2];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(2);
                chai_1.expect(testDirs[0]).to.equal(dir);
                chai_1.expect(testDirs[1]).to.equal(dir2);
            });
            test('Test getting the test folder in pytest (with multiple dirs in the middle)', function () {
                if (product !== types_1.Product.pytest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const dir2 = path.join('a', 'b', '2');
                const args = ['anzy', '--one', '--rootdir', dir, '--rootdir', dir2, '-xyz'];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(2);
                chai_1.expect(testDirs[0]).to.equal(dir);
                chai_1.expect(testDirs[1]).to.equal(dir2);
            });
            test('Test getting the test folder in pytest (with single positional dir)', function () {
                if (product !== types_1.Product.pytest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const args = ['anzy', '--one', dir];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(1);
                chai_1.expect(testDirs[0]).to.equal(dir);
            });
            test('Test getting the test folder in pytest (with multiple positional dirs)', function () {
                if (product !== types_1.Product.pytest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const dir2 = path.join('a', 'b', '2');
                const args = ['anzy', '--one', dir, dir2];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(2);
                chai_1.expect(testDirs[0]).to.equal(dir);
                chai_1.expect(testDirs[1]).to.equal(dir2);
            });
            test('Test getting the test folder in pytest (with multiple dirs excluding python files)', function () {
                if (product !== types_1.Product.pytest) {
                    return this.skip();
                }
                const dir = path.join('a', 'b', 'c');
                const dir2 = path.join('a', 'b', '2');
                const args = ['anzy', '--one', dir, dir2, path.join(dir, 'one.py')];
                const testDirs = argumentsService.getTestFolders(args);
                chai_1.expect(testDirs).to.be.lengthOf(2);
                chai_1.expect(testDirs[0]).to.equal(dir);
                chai_1.expect(testDirs[1]).to.equal(dir2);
            });
            test('Test filtering of arguments', () => {
                const args = [];
                const knownOptions = argumentsService.getKnownOptions();
                const argumentsToRemove = [];
                const expectedFilteredArgs = [];
                // Generate some random arguments.
                for (let i = 0; i < 5; i += 1) {
                    args.push(knownOptions.withArgs[i], `Random Value ${i}`);
                    args.push(knownOptions.withoutArgs[i]);
                    if (i % 2 === 0) {
                        argumentsToRemove.push(knownOptions.withArgs[i], knownOptions.withoutArgs[i]);
                    }
                    else {
                        expectedFilteredArgs.push(knownOptions.withArgs[i], `Random Value ${i}`);
                        expectedFilteredArgs.push(knownOptions.withoutArgs[i]);
                    }
                }
                const filteredArgs = argumentsService.filterArguments(args, argumentsToRemove);
                chai_1.expect(filteredArgs).to.be.deep.equal(expectedFilteredArgs);
            });
        });
    });
});
function getOptions(product, moduleName, withValues) {
    // const result = spawnSync('/Users/donjayamanne/Desktop/Development/PythonStuff/vscodePythonTesting/testingFolder/venv/bin/python', ['-m', moduleName, '-h']);
    const result = child_process_1.spawnSync(common_1.PYTHON_PATH, ['-m', moduleName, '-h']);
    const output = result.stdout.toString();
    // Our regex isn't the best, so lets exclude stuff that shouldn't be captured.
    const knownOptionsWithoutArgs = [];
    const knownOptionsWithArgs = [];
    if (product === types_1.Product.pytest) {
        knownOptionsWithArgs.push(...['-c', '-p', '-r']);
    }
    if (withValues) {
        return getOptionsWithArguments(output)
            .concat(...knownOptionsWithArgs)
            .filter(item => knownOptionsWithoutArgs.indexOf(item) === -1)
            .sort();
    }
    else {
        return getOptionsWithoutArguments(output)
            .concat(...knownOptionsWithoutArgs)
            .filter(item => knownOptionsWithArgs.indexOf(item) === -1)
            // In pytest, any option begining with --log- is known to have args.
            .filter(item => product === types_1.Product.pytest ? !item.startsWith('--log-') : true)
            .sort();
    }
}
function getOptionsWithoutArguments(output) {
    return getMatches('\\s{1,}(-{1,2}[A-Za-z0-9-]+)(?:,|\\s{2,})', output);
}
function getOptionsWithArguments(output) {
    return getMatches('\\s{1,}(-{1,2}[A-Za-z0-9-]+)(?:=|\\s{0,1}[A-Z])', output);
}
function getMatches(pattern, str) {
    const matches = [];
    const regex = new RegExp(pattern, 'gm');
    let result;
    while ((result = regex.exec(str)) !== null) {
        if (result.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        matches.push(result[1].trim());
    }
    return matches
        .sort()
        .reduce((items, item) => items.indexOf(item) === -1 ? items.concat([item]) : items, []);
}
//# sourceMappingURL=argsService.unit.test.js.map