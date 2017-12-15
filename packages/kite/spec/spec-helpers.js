'use strict';

const os = require('os');
const http = require('http');
const proc = require('child_process');
const Plan = require('../lib/plan');
const {merge} = require('../lib/utils');

beforeEach(() => {
  atom.config.set('kite.loggingLevel', 'error');
});

function sleep(duration) {
  const t = new Date();
  waitsFor(`${duration}ms`, () => { return new Date() - t > duration; });
}

function fakeStdStream() {
  let streamCallback;
  function stream(data) {
    streamCallback && streamCallback(data);
  }

  stream.on = (evt, callback) => {
    if (evt === 'data') { streamCallback = callback; }
  };

  return stream;
}

let _processes;
function fakeProcesses(processes) {
  if (proc.spawn.isSpy) {
    _processes = merge(_processes, processes);
  } else {
    spyOn(proc, 'spawn').andCallFake((process, options) => {
      const mock = _processes[process];
      const ps = {
        stdout: fakeStdStream(),
        stderr: fakeStdStream(),
        on: (evt, callback) => {
          if (evt === 'close') { callback(mock ? mock(ps, options) : 1); }
        },
      };

      return ps;
    });

    spyOn(proc, 'spawnSync').andCallFake((process, options) => {
      const mock = _processes[process];

      const ps = {};
      ps.status = mock ? mock({
        stdout(data) { ps.stdout = data; },
        stderr(data) { ps.stderr = data; },
      }, options) : 1;

      return ps;
    });


    _processes = processes;
  }

  if (processes.exec && !proc.exec.isSpy) {
    spyOn(proc, 'exec').andCallFake((process, options, callback) => {
      const mock = _processes.exec[process];

      let stdout, stderr;

      const status = mock ? mock({
        stdout(data) { stdout = data; },
        stderr(data) { stderr = data; },
      }, options) : 1;

      status === 0
      ? callback(null, stdout)
      : callback({}, stdout, stderr);
    });
  }
}

function fakeResponse(statusCode, data, props) {
  data = data || '';
  props = props || {};

  const resp = {
    statusCode,
    req: {},
    on(event, callback) {
      switch (event) {
        case 'data':
          callback(data);
          break;
        case 'end':
          callback();
          break;
      }
    },
  };
  for (let k in props) { resp[k] = props[k]; }
  resp.headers = resp.headers || {};
  return resp;
}

function fakeRequestMethod(resp) {
  if (resp) {
    switch (typeof resp) {
      case 'boolean':
        resp = fakeResponse(200);
        break;
      case 'object':
        resp = fakeResponse(200, '', resp);
        break;
      case 'string':
        resp = fakeResponse(200, resp, {});
        break;
    }
  }

  return (opts, callback) => ({
    on(type, cb) {
      switch (type) {
        case 'error':
          if (resp === false) { cb({}); }
          break;
        case 'response':
          if (resp) { cb(typeof resp == 'function' ? resp(opts) : resp); }
          break;
      }
    },
    end() {
      if (resp) {
        typeof resp == 'function'
          ? callback(resp(opts))
          : callback(resp);
      }
    },
    write(data) {},
    setTimeout(timeout, callback) {
      if (resp == null) { callback({}); }
    },
  });
}

function fakeKiteInstallPaths() {
  beforeEach(() => {
    fakeProcesses({
      'mdfind': (ps) => {
        ps.stdout('');
        return 0;
      },
    });
  });
}

function fakeRouter(routes) {
  return (opts) => {
    for (let i = 0; i < routes.length; i++) {
      const [predicate, handler] = routes[i];
      if (predicate(opts)) { return handler(opts); }
    }
    return fakeResponse(200);
  };
}

function withKiteInstalled(block) {
  describe('with kite installed', () => {
    fakeKiteInstallPaths();

    beforeEach(() => {
      fakeProcesses({
        'mdfind': (ps, args) => {
          const [, key] = args[0].split(/\s=\s/);
          key === '"com.kite.Kite"'
          ? ps.stdout('/Applications/Kite.app')
          : ps.stdout('');
          return 0;
        },
      });
    });

    block();
  });
}

function withManyKiteInstalled(block) {
  describe('with many kite installed', () => {
    fakeKiteInstallPaths();

    beforeEach(() => {
      fakeProcesses({
        'mdfind': (ps, args) => {
          const [, key] = args[0].split(/\s=\s/);
          key === '"com.kite.Kite"'
          ? ps.stdout('/Applications/Kite.app\n/Users/kite/Kite.app')
          : ps.stdout('');
          return 0;
        },
      });
    });

    block();
  });
}

function withKiteEnterpriseInstalled(block) {
  describe('with kite enterprise installed', () => {
    fakeKiteInstallPaths();

    beforeEach(() => {
      fakeProcesses({
        'mdfind': (ps, args) => {
          const [, key] = args[0].split(/\s=\s/);
          key === '"enterprise.kite.Kite"'
          ? ps.stdout('/Applications/KiteEnterprise.app')
          : ps.stdout('');
          return 0;
        },
      });
    });

    block();
  });
}

function withManyKiteEnterpriseInstalled(block) {
  describe('with many kite enterprise installed', () => {
    fakeKiteInstallPaths();

    beforeEach(() => {
      fakeProcesses({
        'mdfind': (ps, args) => {
          const [, key] = args[0].split(/\s=\s/);
          key === '"enterprise.kite.Kite"'
          ? ps.stdout('/Applications/KiteEnterprise.app\n/Users/kite/KiteEnterprise.app')
          : ps.stdout('');
          return 0;
        },
      });
    });

    block();
  });
}

function withBothKiteInstalled(block) {
  describe('with both kite and kite enterprise installed', () => {
    fakeKiteInstallPaths();

    beforeEach(() => {
      fakeProcesses({
        'mdfind': (ps, args) => {
          const [, key] = args[0].split(/\s=\s/);
          key === '"enterprise.kite.Kite"'
          ? ps.stdout('/Applications/KiteEnterprise.app')
          : ps.stdout('/Applications/Kite.app');
          return 0;
        },
      });
    });

    block();
  });
}

function withManyOfBothKiteInstalled(block) {
  describe('with many of both kite and kite enterprise installed', () => {
    fakeKiteInstallPaths();

    beforeEach(() => {
      fakeProcesses({
        'mdfind': (ps, args) => {
          const [, key] = args[0].split(/\s=\s/);
          key === '"enterprise.kite.Kite"'
          ? ps.stdout('/Applications/KiteEnterprise.app\n/Users/kite/KiteEnterprise.app')
          : ps.stdout('/Applications/Kite.app\n/Users/kite/Kite.app');
          return 0;
        },
      });
    });

    block();
  });
}

function withKiteRunning(block) {
  withKiteInstalled(() => {
    describe(', running', () => {
      beforeEach(() => {
        fakeProcesses({
          ls: (ps) => ps.stdout('kite'),
          '/bin/ps': (ps) => {
            ps.stdout('Kite');
            return 0;
          },
        });
      });

      block();
    });
  });
}

function withKiteNotRunning(block) {
  withKiteInstalled(() => {
    describe(', not running', () => {
      beforeEach(() => {
        fakeProcesses({
          '/bin/ps': (ps) => {
            ps.stdout('');
            return 0;
          },
          defaults: () => 0,
          open: () => 0,
        });
      });

      block();
    });
  });
}

function withManyKiteNotRunning(block) {
  withManyKiteInstalled(() => {
    describe(', not running', () => {
      beforeEach(() => {
        fakeProcesses({
          '/bin/ps': (ps) => {
            ps.stdout('');
            return 0;
          },
          defaults: () => 0,
          open: () => 0,
        });
      });

      block();
    });
  });
}

function withKiteEnterpriseRunning(block) {
  withKiteEnterpriseInstalled(() => {
    describe(', running', () => {
      beforeEach(() => {
        fakeProcesses({
          '/bin/ps': (ps) => {
            ps.stdout('KiteEnterprise');
            return 0;
          },
        });
      });

      block();
    });
  });
}

function withKiteEnterpriseNotRunning(block) {
  withKiteEnterpriseInstalled(() => {
    describe(', not running', () => {
      beforeEach(() => {
        fakeProcesses({
          '/bin/ps': (ps) => {
            ps.stdout('');
            return 0;
          },
          defaults: () => 0,
          open: () => 0,
        });
      });

      block();
    });
  });
}

function withManyKiteEnterpriseNotRunning(block) {
  withManyKiteEnterpriseInstalled(() => {
    describe(', not running', () => {
      beforeEach(() => {
        fakeProcesses({
          '/bin/ps': (ps) => {
            ps.stdout('');
            return 0;
          },
          defaults: () => 0,
          open: () => 0,
        });
      });

      block();
    });
  });
}

function withBothKiteNotRunning(block) {
  withBothKiteInstalled(() => {
    describe(', not running', () => {
      beforeEach(() => {
        fakeProcesses({
          '/bin/ps': (ps) => {
            ps.stdout('');
            return 0;
          },
          defaults: () => 0,
          open: () => 0,
        });
      });

      block();
    });
  });
}

function withManyOfBothKiteNotRunning(block) {
  withManyOfBothKiteInstalled(() => {
    describe(', not running', () => {
      beforeEach(() => {
        fakeProcesses({
          '/bin/ps': (ps) => {
            ps.stdout('');
            return 0;
          },
          defaults: () => 0,
          open: () => 0,
        });
      });

      block();
    });
  });
}

function withFakeServer(routes, block) {
  if (typeof routes == 'function') {
    block = routes;
    routes = [];
  }

  routes.push([o => true, o => fakeResponse(404)]);

  describe('', () => {
    beforeEach(function() {
      this.routes = routes.concat();
      const router = fakeRouter(this.routes);
      spyOn(http, 'request').andCallFake(fakeRequestMethod(router));
    });

    block();
  });
}

function withKiteReachable(routes, block) {
  if (typeof routes == 'function') {
    block = routes;
    routes = [];
  }

  routes.push([o => o.path === '/settings', o => fakeResponse(200)]);
  routes.push([o => o.path === '/clientapi/user', o => fakeResponse(200, '{}')]);
  routes.push([o => o.path.indexOf('/clientapi/plan') !== -1, o => fakeResponse(200, '{}')]);

  withKiteRunning(() => {
    describe(', reachable', () => {
      withFakeServer(routes, () => {
        block();
      });
    });
  });
}

function withKiteNotReachable(block) {
  withKiteRunning(() => {
    describe(', not reachable', () => {
      beforeEach(() => {
        spyOn(http, 'request').andCallFake(fakeRequestMethod(false));
      });

      block();
    });
  });
}

function withKiteAuthenticated(routes, block) {
  if (typeof routes == 'function') {
    block = routes;
    routes = [];
  }

  routes.push([
    o => /^\/clientapi\/user/.test(o.path),
    o => fakeResponse(200, 'authenticated'),
  ]);

  withKiteReachable(routes, () => {
    describe(', authenticated', () => {
      block();
    });
  });
}

function withKiteNotAuthenticated(block) {
  withKiteReachable([
    [o => o.path === '/clientapi/user', o => fakeResponse(401)],
  ], () => {
    describe(', not authenticated', () => {
      block();
    });
  });
}

function withKiteWhitelistedPaths(paths, block) {
  if (typeof paths == 'function') {
    block = paths;
    paths = [];
  }

  const tokenRe = /^\/api\/buffer\/atom\/(.*)\/.*\/tokens/;
  const projectDirRe = /^\/clientapi\/projectdir\?filename=(.+)$/;
  const notifyRe = /^\/clientapi\/permissions\/notify\?filename=(.+)$/;

  const whitelisted = match => {
    const path = match.replace(/:/g, '/');
    return paths.some(p => path.indexOf(p) !== -1);
  };

  const routes = [
    [
      o => {
        const match = tokenRe.exec(o.path);
        return match && whitelisted(match[1]);
      },
      o => fakeResponse(200, JSON.stringify({tokens: []})),
    ], [
      o => {
        const match = tokenRe.exec(o.path);
        return match && !whitelisted(match[1]);
      },
      o => fakeResponse(403),
    ], [
      o => projectDirRe.test(o.path),
      o => fakeResponse(200, os.homedir()),
    ], [
      o => notifyRe.test(o.path),
      o => fakeResponse(200),
    ],
  ];

  withKiteAuthenticated(routes, () => {
    describe('with whitelisted paths', () => {
      block();
    });
  });
}

function withKiteIgnoredPaths(paths) {
  const tokenRe = /^\/api\/buffer\/atom\/.*\/(.*)\/tokens/;
  const ignored = match => {
    const path = match.replace(/:/g, '/');
    return paths.some(p => path.indexOf(p) !== -1);
  };

  withKiteBlacklistedPaths(paths);
  withRoutes([
    [
      o => {
        const match = tokenRe.exec(o.path);
        return o.method === 'GET' && match && ignored(match[1]);
      },
      o => fakeResponse(403),
    ],
  ]);
}

function withKiteBlacklistedPaths(paths) {
  const notifyRe = /^\/clientapi\/permissions\/notify\?filename=(.+)$/;
  const blacklisted = path => paths.some(p => path.indexOf(p) !== -1);

  withRoutes([
    [
      o => {
        const match = notifyRe.exec(o.path);
        return o.method === 'GET' && match && blacklisted(match[1]);
      },
      o => fakeResponse(403),
    ],
  ]);
}

function withRoutes(routes) {
  beforeEach(function() {
    routes.reverse().forEach(route => this.routes.unshift(route));
  });
}

function withPlan(description, plan, block) {
  describe(description, () => {
    withRoutes([
      [
        o => o.path.indexOf('/clientapi/plan') === 0,
        o => fakeResponse(200, JSON.stringify(plan)),
      ], [
        o => o.path.indexOf('/clientapi/status') === 0,
        o => fakeResponse(200, JSON.stringify({status: 'ready'})),
      ], [
        o => /^\/api\/account\/user/.test(o.path),
        o => fakeResponse(200, JSON.stringify({email_verified: true})),
      ],
    ]);


    beforeEach(() => {
      waitsForPromise(() => Plan.queryPlan());
    });

    block();
  });
}

function withFakePlan(description, plan, block) {
  describe(description, () => {
    beforeEach(() => {
      Plan.plan = plan;
    });

    block();
  });
}

module.exports = {
  fakeProcesses, fakeRequestMethod, fakeResponse, fakeKiteInstallPaths,

  withKiteInstalled, withManyKiteInstalled,
  withKiteEnterpriseInstalled, withManyKiteEnterpriseInstalled,
  withBothKiteInstalled, withManyOfBothKiteInstalled,

  withKiteRunning, withKiteNotRunning, withManyKiteNotRunning,
  withKiteEnterpriseRunning, withKiteEnterpriseNotRunning,
  withManyKiteEnterpriseNotRunning,
  withBothKiteNotRunning, withManyOfBothKiteNotRunning,

  withKiteReachable, withKiteNotReachable,
  withKiteAuthenticated, withKiteNotAuthenticated,
  withKiteWhitelistedPaths, withKiteBlacklistedPaths, withKiteIgnoredPaths,
  withFakeServer, withRoutes, withPlan, withFakePlan,
  sleep,
};
