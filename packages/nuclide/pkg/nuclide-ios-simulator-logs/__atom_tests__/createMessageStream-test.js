"use strict";

function _featureConfig() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons-atom/feature-config"));

  _featureConfig = function () {
    return data;
  };

  return data;
}

function _createMessageStream() {
  const data = require("../lib/createMessageStream");

  _createMessageStream = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 *  strict-local
 * @format
 * @emails oncall+nuclide
 */
beforeEach(() => {
  _featureConfig().default.set('nuclide-ios-simulator-logs.senderBlacklist', []);
});
describe('createMessageStream', () => {
  it('splits the output by record', async () => {
    const original = _featureConfig().default.observeAsStream.bind(_featureConfig().default);

    jest.spyOn(_featureConfig().default, 'observeAsStream').mockImplementation(name => name === 'nuclide-ios-simulator-logs.whitelistedTags' ? _rxjsCompatUmdMin.Observable.of('.*') : original(name));

    const output = _rxjsCompatUmdMin.Observable.from(OUTPUT_LINES);

    const messages = await (0, _createMessageStream().createMessageStream)(output).map(message => message.text).toArray().toPromise();
    expect(messages).toEqual(['Message 1', 'Message 2']);
  });
  it('only includes messages with whitelisted tags', async () => {
    const original = _featureConfig().default.observeAsStream.bind(_featureConfig().default);

    jest.spyOn(_featureConfig().default, 'observeAsStream').mockImplementation(name => name === 'nuclide-ios-simulator-logs.whitelistedTags' ? _rxjsCompatUmdMin.Observable.of('X|ExampleTag') : original(name));

    const output = _rxjsCompatUmdMin.Observable.from(OUTPUT_LINES);

    const messages = await (0, _createMessageStream().createMessageStream)(output).map(message => message.text).toArray().toPromise();
    expect(messages).toEqual(['Message 2']);
  });
  it('shows an error (once) if the regular expression is invalid', async () => {
    jest.spyOn(atom.notifications, 'addError').mockImplementation(() => {});

    const original = _featureConfig().default.observeAsStream.bind(_featureConfig().default);

    jest.spyOn(_featureConfig().default, 'observeAsStream').mockImplementation(name => name === 'nuclide-ios-simulator-logs.whitelistedTags' ? _rxjsCompatUmdMin.Observable.of('(') : original(name));

    const output = _rxjsCompatUmdMin.Observable.from(OUTPUT_LINES);

    await (0, _createMessageStream().createMessageStream)(output).toPromise();
    expect(atom.notifications.addError.mock.calls.length).toBe(1);
  });
});
const OUTPUT_LINES = ['<?xml version="1.0" encoding="UTF-8"?>', '<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">', '<plist version="1.0">', '<array>', '  <dict>', '    <key>ASLMessageID</key>', '    <string>54706</string>', '    <key>Time</key>', '    <string>Feb 17 12:52:17</string>', '    <key>TimeNanoSec</key>', '    <string>469585000</string>', '    <key>Level</key>', '    <string>2</string>', '    <key>PID</key>', '    <string>38152</string>', '    <key>UID</key>', '    <string>1507447745</string>', '    <key>GID</key>', '    <string>1876110778</string>', '    <key>ReadGID</key>', '    <string>80</string>', '    <key>Host</key>', '    <string>matthewwith-mbp</string>', '    <key>Sender</key>', '    <string>UIExplorer</string>', '    <key>Facility</key>', '    <string>user</string>', '    <key>Message</key>', '    <string>Message 1</string>', '    <key>ASLSHIM</key>', '    <string>1</string>', '    <key>SenderMachUUID</key>', '    <string>09F5C0C0-7587-39E8-A92E-7B130965D76C</string>', '  </dict>', '</array>', '</plist>', '<?xml version="1.0" encoding="UTF-8"?>', '<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">', '<plist version="1.0">', '<array>', '  <dict>', '    <key>ASLMessageID</key>', '    <string>54706</string>', '    <key>Time</key>', '    <string>Feb 17 12:52:17</string>', '    <key>TimeNanoSec</key>', '    <string>469585000</string>', '    <key>Level</key>', '    <string>2</string>', '    <key>PID</key>', '    <string>38152</string>', '    <key>UID</key>', '    <string>1507447745</string>', '    <key>GID</key>', '    <string>1876110778</string>', '    <key>ReadGID</key>', '    <string>80</string>', '    <key>Host</key>', '    <string>matthewwith-mbp</string>', '    <key>Sender</key>', '    <string>UIExplorer</string>', '    <key>Facility</key>', '    <string>user</string>', '    <key>Message</key>', '    <string>2016-08-24 15:58:33.113 [ExampleTag] Message 2</string>', '    <key>ASLSHIM</key>', '    <string>1</string>', '    <key>SenderMachUUID</key>', '    <string>09F5C0C0-7587-39E8-A92E-7B130965D76C</string>', '  </dict>', '</array>', '</plist>'];