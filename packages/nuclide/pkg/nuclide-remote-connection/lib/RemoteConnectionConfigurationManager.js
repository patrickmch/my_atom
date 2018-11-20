"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getConnectionConfig = getConnectionConfig;
exports.setConnectionConfig = setConnectionConfig;
exports.clearConnectionConfig = clearConnectionConfig;
exports.__test__ = exports.SERVER_CONFIG_REQUEST_EVENT = exports.SERVER_CONFIG_RESPONSE_EVENT = void 0;

var _crypto = _interopRequireDefault(require("crypto"));

function _log4js() {
  const data = require("log4js");

  _log4js = function () {
    return data;
  };

  return data;
}

function keytar() {
  const data = _interopRequireWildcard(require("nuclide-prebuilt-libs/keytar"));

  keytar = function () {
    return data;
  };

  return data;
}

var _electron = _interopRequireDefault(require("electron"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
 */

/* global localStorage */
const CONFIG_DIR = 'nuclide-connections';
const logger = (0, _log4js().getLogger)('nuclide-remote-connection');
const remote = _electron.default.remote;
const ipc = _electron.default.ipcRenderer;

if (!remote) {
  throw new Error("Invariant violation: \"remote\"");
}

if (!ipc) {
  throw new Error("Invariant violation: \"ipc\"");
}

const SERVER_CONFIG_RESPONSE_EVENT = 'server-config-response';
exports.SERVER_CONFIG_RESPONSE_EVENT = SERVER_CONFIG_RESPONSE_EVENT;
const SERVER_CONFIG_REQUEST_EVENT = 'server-config-request';
/**
 * Version of ServerConnectionConfiguration that uses string instead of Buffer for fields so it can
 * be translated directly to/from JSON.
 */

exports.SERVER_CONFIG_REQUEST_EVENT = SERVER_CONFIG_REQUEST_EVENT;

// Insecure configs are used for testing only.
function isInsecure(config) {
  return config.clientKey == null && config.clientCertificate == null && config.certificateAuthorityCertificate == null;
}

function getStorageKey(host) {
  return `${CONFIG_DIR}:${host}`;
}

async function getConnectionConfigViaIPC(host) {
  const thisWindowsId = remote.getCurrentWindow().id;
  const otherWindows = remote.BrowserWindow.getAllWindows().filter(win => win.isVisible() && win.id !== thisWindowsId);
  const timeoutInMilliseconds = 5000;
  return new Promise(resolve => {
    if (otherWindows.length === 0) {
      resolve(null);
      return;
    }

    let responseCount = 0; // set a timeout to remove all listeners and resolve if
    // we don't get responses in some fixed amount of time

    const timeout = setTimeout(() => {
      logger.error('timed out waiting for ipc response(s) from other windows');
      resolve(null);
      ipc.removeAllListeners(SERVER_CONFIG_RESPONSE_EVENT);
    }, timeoutInMilliseconds);
    ipc.on(SERVER_CONFIG_RESPONSE_EVENT, (event, config) => {
      responseCount++;

      if (config != null || responseCount === otherWindows.length) {
        if (config != null) {
          logger.info('received the config! removing other listeners');
        }

        resolve(config);
        clearTimeout(timeout);
        ipc.removeAllListeners(SERVER_CONFIG_RESPONSE_EVENT);
      }
    });
    otherWindows.forEach(window => {
      logger.info(`requesting config from window ${window.id}`); // NOTE: I tried using sendTo here but it wasn't working well
      // (seemed like it was flaky). It might be worth trying it
      // again after we upgrade electron

      window.webContents.send(SERVER_CONFIG_REQUEST_EVENT, host, thisWindowsId);
    });
  });
}

async function getConnectionConfig(host) {
  const storedConfig = localStorage.getItem(getStorageKey(host));

  if (storedConfig == null) {
    return null;
  }

  try {
    return await decryptConfig(JSON.parse(storedConfig));
  } catch (e) {
    logger.error(`The configuration file for ${host} is corrupted.`, e);
    logger.info('falling back to getting the config via ipc');
    const config = await getConnectionConfigViaIPC(host);
    return config;
  }
}

async function setConnectionConfig(config, ipAddress) {
  // Don't attempt to store insecure connections.
  // Insecure connections are used for testing and will fail the encryption call below.
  if (isInsecure(config)) {
    return;
  }

  try {
    const encrypted = JSON.stringify((await encryptConfig(config)));
    localStorage.setItem(getStorageKey(config.host), encrypted); // Store configurations by their IP address as well.
    // This way, multiple aliases for the same hostname can reuse a single connection.

    localStorage.setItem(getStorageKey(ipAddress), encrypted);
  } catch (e) {
    logger.error(`Failed to store configuration file for ${config.host}.`, e);
  }
}

async function clearConnectionConfig(host) {
  try {
    localStorage.removeItem(getStorageKey(host));
  } catch (e) {
    logger.error(`Failed to clear configuration for ${host}.`, e);
  }
}
/**
 * Encrypts the clientKey of a ConnectionConfig.
 * @param remoteProjectConfig - The config with the clientKey we want encrypted.
 * @return returns the passed in config with the clientKey encrypted.
 */


async function encryptConfig(remoteProjectConfig) {
  const sha1 = _crypto.default.createHash('sha1');

  sha1.update(`${remoteProjectConfig.host}:${remoteProjectConfig.port}`);
  const sha1sum = sha1.digest('hex');
  const {
    certificateAuthorityCertificate,
    clientCertificate,
    clientKey
  } = remoteProjectConfig;

  if (!clientKey) {
    throw new Error("Invariant violation: \"clientKey\"");
  }

  const realClientKey = clientKey.toString(); // Convert from Buffer to string.

  const {
    salt,
    password,
    encryptedString
  } = encryptString(realClientKey);
  await keytar().setPassword('nuclide.remoteProjectConfig', sha1sum, password);
  const clientKeyWithSalt = encryptedString + '.' + salt;

  if (!certificateAuthorityCertificate) {
    throw new Error("Invariant violation: \"certificateAuthorityCertificate\"");
  }

  if (!clientCertificate) {
    throw new Error("Invariant violation: \"clientCertificate\"");
  }

  return {
    host: remoteProjectConfig.host,
    port: remoteProjectConfig.port,
    family: remoteProjectConfig.family,
    certificateAuthorityCertificate: certificateAuthorityCertificate.toString(),
    clientCertificate: clientCertificate.toString(),
    clientKey: clientKeyWithSalt,
    version: remoteProjectConfig.version
  };
}
/**
 * Decrypts the clientKey of a SerializableServerConnectionConfiguration.
 * @param remoteProjectConfig - The config with the clientKey we want encrypted.
 * @return returns the passed in config with the clientKey encrypted.
 */


async function decryptConfig(remoteProjectConfig) {
  const sha1 = _crypto.default.createHash('sha1');

  sha1.update(`${remoteProjectConfig.host}:${remoteProjectConfig.port}`);
  const sha1sum = sha1.digest('hex');
  const password = await keytar().getPassword('nuclide.remoteProjectConfig', sha1sum);

  if (password == null) {
    throw new Error('Cannot find password for encrypted client key');
  }

  const {
    certificateAuthorityCertificate,
    clientCertificate,
    clientKey
  } = remoteProjectConfig; // flowlint-next-line sketchy-null-string:off

  if (!clientKey) {
    throw new Error("Invariant violation: \"clientKey\"");
  }

  const [encryptedString, salt] = clientKey.split('.');

  if (!encryptedString || !salt) {
    throw new Error('Cannot decrypt client key');
  }

  const restoredClientKey = decryptString(encryptedString, password, salt);

  if ( // @lint-ignore PRIVATEKEY1
  !restoredClientKey.startsWith('-----BEGIN RSA PRIVATE KEY-----')) {
    (0, _log4js().getLogger)('nuclide-remote-connection').error(`decrypted client key did not start with expected header: ${restoredClientKey}`);
  } // flowlint-next-line sketchy-null-string:off


  if (!certificateAuthorityCertificate) {
    throw new Error("Invariant violation: \"certificateAuthorityCertificate\"");
  } // flowlint-next-line sketchy-null-string:off


  if (!clientCertificate) {
    throw new Error("Invariant violation: \"clientCertificate\"");
  }

  return {
    host: remoteProjectConfig.host,
    port: remoteProjectConfig.port,
    family: remoteProjectConfig.family,
    certificateAuthorityCertificate: new Buffer(certificateAuthorityCertificate),
    clientCertificate: new Buffer(clientCertificate),
    clientKey: new Buffer(restoredClientKey),
    version: remoteProjectConfig.version
  };
}

function decryptString(text, password, salt) {
  const decipher = _crypto.default.createDecipheriv('aes-128-cbc', new Buffer(password, 'base64'), new Buffer(salt, 'base64'));

  let decryptedString = decipher.update(text, 'base64', 'utf8');
  decryptedString += decipher.final('utf8');
  return decryptedString;
}

function encryptString(text) {
  const password = _crypto.default.randomBytes(16).toString('base64');

  const salt = _crypto.default.randomBytes(16).toString('base64');

  const cipher = _crypto.default.createCipheriv('aes-128-cbc', new Buffer(password, 'base64'), new Buffer(salt, 'base64'));

  let encryptedString = cipher.update(text,
  /* input_encoding */
  'utf8',
  /* output_encoding */
  'base64');
  encryptedString += cipher.final('base64');
  return {
    password,
    salt,
    encryptedString
  };
}

const __test__ = {
  decryptString,
  encryptString
};
exports.__test__ = __test__;