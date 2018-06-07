'use strict';

var _fs = _interopRequireDefault(require('fs'));

var _glob;

function _load_glob() {
  return _glob = _interopRequireDefault(require('glob'));
}

var _nuclideUri;

function _load_nuclideUri() {
  return _nuclideUri = _interopRequireDefault(require('../nuclideUri'));
}

var _testHelpers;

function _load_testHelpers() {
  return _testHelpers = require('../test-helpers');
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('arePropertiesEqual', () => {
  it('correctly compares empty objects', () => {
    expect((0, (_testHelpers || _load_testHelpers()).arePropertiesEqual)({}, {})).toBe(true);
  });

  it('correctly compares objects with the same properties', () => {
    expect((0, (_testHelpers || _load_testHelpers()).arePropertiesEqual)({ foo: 5 }, { foo: 5 })).toBe(true);
  });

  it('allows one property to be undefined while another does not exist at all', () => {
    expect((0, (_testHelpers || _load_testHelpers()).arePropertiesEqual)({ foo: undefined }, {})).toBe(true);
  });

  it('returns false when properties are not equal', () => {
    expect((0, (_testHelpers || _load_testHelpers()).arePropertiesEqual)({ foo: 5 }, { foo: 4 })).toBe(false);
  });

  it('returns false when one property is undefined and another is defined', () => {
    expect((0, (_testHelpers || _load_testHelpers()).arePropertiesEqual)({ foo: 5 }, { foo: undefined })).toBe(false);
    expect((0, (_testHelpers || _load_testHelpers()).arePropertiesEqual)({ foo: undefined }, { foo: 5 })).toBe(false);
  });

  it('returns false when one property exists but the other does not', () => {
    expect((0, (_testHelpers || _load_testHelpers()).arePropertiesEqual)({ foo: 5 }, {})).toBe(false);
    expect((0, (_testHelpers || _load_testHelpers()).arePropertiesEqual)({}, { foo: 5 })).toBe(false);
  });
}); /**
     * Copyright (c) 2017-present, Facebook, Inc.
     * All rights reserved.
     *
     * This source code is licensed under the BSD-style license found in the
     * LICENSE file in the root directory of this source tree. An additional grant
     * of patent rights can be found in the PATENTS file in the same directory.
     *
     * 
     * @format
     */

describe('expectAsyncFailure', () => {
  it('fails when provided Promise succeeds', async () => {
    const verify = jest.fn();
    await expect((0, (_testHelpers || _load_testHelpers()).expectAsyncFailure)(Promise.resolve('resolved, not rejected!'), verify)).rejects.toThrow(/but did not/);
    expect(verify.mock.calls).toHaveLength(0);
  });

  it('fails when provided Promise fails but with wrong error message', async () => {
    let callCount = 0;
    function verify(error) {
      ++callCount;
      const expectedMessage = 'I failed badly.';
      if (error.message !== expectedMessage) {
        throw Error(`Expected '${expectedMessage}', but was ${error.message}.`);
      }
    }

    await expect((0, (_testHelpers || _load_testHelpers()).expectAsyncFailure)(Promise.reject(Error('I failed.')), verify)).rejects.toThrow(/I failed/);
    expect(callCount).toBe(1);
  });

  it('succeeds when provided Promise fails in the expected way', async () => {
    let callCount = 0;
    function verify(error) {
      ++callCount;
      const expectedMessage = 'I failed badly.';
      if (error.message !== expectedMessage) {
        throw Error(`Expected '${expectedMessage}', but was ${error.message}.`);
      }
    }

    await (0, (_testHelpers || _load_testHelpers()).expectAsyncFailure)(Promise.reject(Error('I failed badly.')), verify);
    expect(callCount).toBe(1);
  });
});

describe('generateFixture', () => {
  it('should create the directory hierarchy', async () => {
    await (async () => {
      const fixturePath = await (0, (_testHelpers || _load_testHelpers()).generateFixture)('fixture-to-generate', new Map([['foo.js', undefined], ['bar/baz.txt', 'some text']]));

      expect((_nuclideUri || _load_nuclideUri()).default.isAbsolute(fixturePath)).toBe(true);
      expect(_fs.default.statSync(fixturePath).isDirectory()).toBe(true);

      const fooPath = (_nuclideUri || _load_nuclideUri()).default.join(fixturePath, 'foo.js');
      const bazPath = (_nuclideUri || _load_nuclideUri()).default.join(fixturePath, 'bar/baz.txt');

      expect(_fs.default.statSync(fooPath).isFile()).toBe(true);
      expect(_fs.default.statSync(bazPath).isFile()).toBe(true);

      expect(_fs.default.readFileSync(fooPath, 'utf8')).toBe('');
      expect(_fs.default.readFileSync(bazPath, 'utf8')).toBe('some text');
    })();
  });

  it('should work with lots of files', async () => {
    await (async () => {
      const files = new Map();
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 1000; j++) {
          files.set(`dir_${i}/file_${j}.txt`, `${i} + ${j} = ${i + j}`);
        }
      }
      const fixturePath = await (0, (_testHelpers || _load_testHelpers()).generateFixture)('lots-of-files', files);
      const fixtureFiles = (_glob || _load_glob()).default.sync((_nuclideUri || _load_nuclideUri()).default.join(fixturePath, 'dir_*/file_*.txt'));
      expect(fixtureFiles.length).toBe(10000);
    })();
  }, 10000);

  it('should work with no files', async () => {
    await (async () => {
      const fixturePath = await (0, (_testHelpers || _load_testHelpers()).generateFixture)('fixture-empty', new Map());
      expect((_nuclideUri || _load_nuclideUri()).default.isAbsolute(fixturePath)).toBe(true);
      expect(_fs.default.statSync(fixturePath).isDirectory()).toBe(true);
      expect(_fs.default.readdirSync(fixturePath)).toEqual([]);
    })();
  });

  it('works with no files arg', async () => {
    await (async () => {
      const fixturePath = await (0, (_testHelpers || _load_testHelpers()).generateFixture)('fixture-empty');
      expect((_nuclideUri || _load_nuclideUri()).default.isAbsolute(fixturePath)).toBe(true);
      expect(_fs.default.statSync(fixturePath).isDirectory()).toBe(true);
      expect(_fs.default.readdirSync(fixturePath)).toEqual([]);
    })();
  });
});

describe('Mocking Imports test suite', () => {
  // Tests ToBeTested.functionToTest while mocking imported function toBeMocked.
  it('Mocking imported dependencies', () => {
    // 1 - First mock all functions imported by the module under test
    const mock = jest.spyOn(require('../__mocks__/fixtures/toBeMocked'), 'importedFunction').mockReturnValue(45);

    // 2 - Do an uncachedRequire of the module to test
    // Note the 'import typeof * as ... ' above to get type checking
    // for the functions to be tested.
    // You may want to put steps 1 & 2 in your beforeEach.
    const moduleToTest = (0, (_testHelpers || _load_testHelpers()).uncachedRequire)(require, '../__mocks__/fixtures/toBeTested');

    // 3 - Perform your test
    const result = moduleToTest.functionToTest();
    expect(mock).toHaveBeenCalledWith(42);
    expect(result).toEqual(45);

    // 4 - Reset the require cache so your mocks don't get used for other tests.
    // You may want to put this in your afterEach.
    (0, (_testHelpers || _load_testHelpers()).clearRequireCache)(require, '../__mocks__/fixtures/toBeTested');
  });
});