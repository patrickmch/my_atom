'use strict';

const kitePkg = require('../package.json');
const {distinctID, EDITOR_UUID, OS_VERSION} = require('./metrics');

window._rollbarConfig = {
  accessToken: 'd1aa81c4290d409e847153a29b2872b3',
  payload: {
    environment: 'production',
    distinctID: distinctID(),
    editor_uuid: EDITOR_UUID,
    editor: 'atom',
    atom_version: atom.getVersion(),
    kite_plugin_version: kitePkg.version,
    os: OS_VERSION,
  },
};

require('rollbar-browser');

class RollbarReporter {
  constructor() {
    this.subscription = atom.onDidThrowError(({column, line, message, originalError, url}) => {
      // We're only concerned by errors that originate or involve our code
      // but not when working on it.
      if (/\/kite\/|\/kite-installer\//.test(originalError.stack) &&
          !/kite$/.test(atom.project.getPaths()[0] || '')) {
        window.Rollbar.error(originalError);
      }
    });
  }

  dispose() {
    this.subscription && this.subscription.dispose();
  }
}

module.exports = RollbarReporter;
