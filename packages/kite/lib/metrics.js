'use strict';

var os = require('os');
const crypto = require('crypto');
const {Logger, StateController} = require('kite-installer');
const {metricsCounterPath} = require('./urls');
const localconfig = require('./localconfig.js');
const Segment = require('analytics-node');

const version = require('../package.json').version;

const OS_VERSION = os.type() + ' ' + os.release();

const EDITOR_UUID = localStorage.getItem('metrics.userId');

// Dev Segment: lKUjCVUmzSpxblG611Dr6pct8fu7ty9W
// Prod Segment: 9ZGfMQ24THOg69yIyZRPJ1GTJ9RsBlFK

const ANALYTICS = new Segment(
  atom.inDevMode()
  ? 'lKUjCVUmzSpxblG611Dr6pct8fu7ty9W'
  : 'hZHSUR8FABnNidGOa3WnYAtHyBBsaoGA');

// Generate a unique ID for this user and save it for future use.
function distinctID() {
  var id = localconfig.get('distinctID');
  if (id === undefined) {
    // use the atom UUID
    id = EDITOR_UUID || crypto.randomBytes(32).toString('hex');
    localconfig.set('distinctID', id);
  }
  return id;
}

let macaddress;

require('getmac').getMac((err, mac) => {
  if (err) { throw err; }
  macaddress = mac;
});

function sendFeatureMetric(name) {
  const path = metricsCounterPath();

  Logger.debug('feature metric:', name);

  return StateController.client.request({
    path,
    method: 'POST',
  }, JSON.stringify({
    name,
    value: 1,
  })).then(resp => {
    Logger.logResponse(resp);
    return resp;
  });
}

function featureRequested(name) {
  sendFeatureMetric(`atom_${name}_requested`);
}

function featureFulfilled(name) {
  sendFeatureMetric(`atom_${name}_fulfilled`);
}

function track(event, properties = {}) {
  const e = {
    event,
    userId: '0',
    properties,
  };

  if (!atom.inSpecMode() && macaddress) { ANALYTICS.track(e); }
}

function trackHealth(value) {
  track('kited_health', {
    user_id: macaddress,
    sent_at: Math.floor(new Date().getTime() / 1000),
    source: 'atom',
    value,
    os_name: getOsName(),
    plugin_version: version,
  });
}

function getOsName() {
  switch (os.platform()) {
    case 'darwin': return 'macos';
    case 'win32': return 'windows';
    default: return '';
  }
}

module.exports = {
  distinctID,
  featureRequested,
  featureFulfilled,
  track,
  trackHealth,
  EDITOR_UUID,
  OS_VERSION,
};
