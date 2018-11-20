"use strict";

function _nuclideUri() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/nuclideUri"));

  _nuclideUri = function () {
    return data;
  };

  return data;
}

function _process() {
  const data = require("../../../modules/nuclide-commons/process");

  _process = function () {
    return data;
  };

  return data;
}

var _os = _interopRequireDefault(require("os"));

function _yargs() {
  const data = _interopRequireDefault(require("yargs"));

  _yargs = function () {
    return data;
  };

  return data;
}

function _CommandClient() {
  const data = require("./CommandClient");

  _CommandClient = function () {
    return data;
  };

  return data;
}

function _errors() {
  const data = require("./errors");

  _errors = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * 
 * @format
 */

/*
 * CLI for printing information about the Atom clients connected to the Nuclide
 * server running on this machine. By default, it lists the remote root folders
 * in the Atom clients that correspond to this host. The list is written to
 * stdout as JSON.
 */
async function main(argv) {
  (0, _errors().setupLogging)();
  (0, _errors().setupErrorHandling)(); // Connect to the Nuclide server running on this host, if it exists.

  let commands = null;

  try {
    commands = await (0, _CommandClient().getCommands)(argv,
    /* rejectIfZeroConnections */
    false);
  } catch (error) {
    // Only a FailedConnectionError is expected.
    if (!(error instanceof _errors().FailedConnectionError)) {
      await (0, _errors().trackError)('connections', argv, error);
      return _errors().EXIT_CODE_CONNECTION_ERROR;
    }
  }

  let foldersArray;

  if (commands == null) {
    // If commands is null, then there is no Nuclide server running.
    // We should print an empty array without any ceremony in this case.
    foldersArray = [];
  } else {
    const hostname = _os.default.hostname();

    const isAliasForHostname = async function (alias) {
      if (hostname === alias) {
        return true;
      } else {
        return (await resolveAlias(alias)) === hostname;
      }
    }; // Note that each ClientConnection represents an Atom window, so
    // the rootFolders across windows may overlap. Add all of them to
    // a Set to de-dupe.


    const projectStates = await commands.getProjectStates();
    const rootFolders = new Set();

    for (const projectState of projectStates) {
      for (const rootFolder of projectState.rootFolders) {
        if (_nuclideUri().default.isRemote(rootFolder)) {
          const alias = _nuclideUri().default.getHostname(rootFolder); // eslint-disable-next-line no-await-in-loop


          if (await isAliasForHostname(alias)) {
            const path = _nuclideUri().default.getPath(rootFolder);

            rootFolders.add(path);
          }
        }
      }
    }

    foldersArray = Array.from(rootFolders);
  }

  foldersArray.sort();
  process.stdout.write(JSON.stringify(foldersArray, null, 2));
  process.stdout.write('\n');
  await (0, _errors().trackSuccess)('connections', argv);
  return _errors().EXIT_CODE_SUCCESS;
}

async function resolveAlias(alias) {
  let stdout;

  try {
    stdout = await (0, _process().runCommand)('dig', ['+short', 'cname', alias]).toPromise();
  } catch (e) {
    // Defend against the case where `dig` is not installed.
    return null;
  } // Strip trailing newline. It is possible there was no output
  // if there was nothing to resolve, e.g.: dig +short cname `hostname`.


  stdout = stdout.trim();

  if (stdout === '') {
    return null;
  } // The result likely includes '.' at the end to indicate the
  // result is a fully-qualified domain name. If so, we strip it
  // so it can be compared directly with hostname(1).


  if (stdout.endsWith('.')) {
    stdout = stdout.slice(0, -1);
  }

  return stdout;
}

async function run() {
  const {
    argv
  } = _yargs().default.usage('Usage: nuclide-connections').help('h').alias('h', 'help').option('p', {
    alias: 'port',
    describe: 'Port for connecting to nuclide',
    type: 'number'
  }).option('f', {
    alias: 'family',
    describe: 'Address family for connecting to nuclide. Either "IPv4" or "IPv6".',
    type: 'string'
  });

  const exitCode = await main(argv);
  process.exit(exitCode);
}

run();