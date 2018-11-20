"use strict";

function _reduxObservable() {
  const data = require("../../../modules/nuclide-commons/redux-observable");

  _reduxObservable = function () {
    return data;
  };

  return data;
}

function _tasks() {
  const data = require("../../commons-node/tasks");

  _tasks = function () {
    return data;
  };

  return data;
}

function _UniversalDisposable() {
  const data = _interopRequireDefault(require("../../../modules/nuclide-commons/UniversalDisposable"));

  _UniversalDisposable = function () {
    return data;
  };

  return data;
}

function Actions() {
  const data = _interopRequireWildcard(require("../lib/redux/Actions"));

  Actions = function () {
    return data;
  };

  return data;
}

function Epics() {
  const data = _interopRequireWildcard(require("../lib/redux/Epics"));

  Epics = function () {
    return data;
  };

  return data;
}

function dummy() {
  const data = _interopRequireWildcard(require("../__mocks__/dummy"));

  dummy = function () {
    return data;
  };

  return data;
}

var _rxjsCompatUmdMin = require("rxjs-compat/bundles/rxjs-compat.umd.min.js");

function Immutable() {
  const data = _interopRequireWildcard(require("immutable"));

  Immutable = function () {
    return data;
  };

  return data;
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
 * @emails oncall+nuclide
 */
function getRootEpic() {
  const epics = Object.keys(Epics()).filter(k => k !== 'trackEpic') // Omit the tracking epic
  .map(k => Epics()[k]).filter(epic => typeof epic === 'function');
  return (0, _reduxObservable().combineEpics)(...epics);
}

describe('Epics', () => {
  describe('SET_PROJECT_ROOT', () => {
    describe('when packages arent activated', () => {
      const state = {
        initialPackagesActivated: false
      };
      it('does nothing', async () => {
        const output = await runActions([Actions().setProjectRoot(null)], state).toArray().toPromise();
        expect(output).toEqual([]);
      });
    });
    describe('when there are no task runners', () => {
      const state = {
        initialPackagesActivated: true,
        taskRunners: Immutable().List()
      };
      it('set task runners states to an empty map', async () => {
        const output = await runActions([Actions().setProjectRoot(null)], state).first().toPromise();

        if (!(output.type === Actions().SET_STATES_FOR_TASK_RUNNERS)) {
          throw new Error("Invariant violation: \"output.type === Actions.SET_STATES_FOR_TASK_RUNNERS\"");
        }

        expect(output.payload.statesForTaskRunners).toEqual(Immutable().Map());
      });
    });
    describe('when there are task runners', () => {
      let taskRunner;
      let state;
      beforeEach(() => {
        taskRunner = new (dummy().TaskRunner)();
        const task = new (dummy().createTask)('test task');
        taskRunner = Object.assign({}, taskRunner, {
          setProjectRoot: (projectRoot, callback) => {
            callback(true, [task]);
            return new (_UniversalDisposable().default)();
          }
        });
        state = {
          initialPackagesActivated: true,
          taskRunners: Immutable().List([taskRunner])
        };
      });
      it('updates states after collecting them from all task runners', async () => {
        const output = await runActions([Actions().setProjectRoot(null)], state).first().toPromise();

        if (!(output.type === Actions().SET_STATES_FOR_TASK_RUNNERS)) {
          throw new Error("Invariant violation: \"output.type === Actions.SET_STATES_FOR_TASK_RUNNERS\"");
        }

        const runnerState = output.payload.statesForTaskRunners.get(taskRunner);

        if (!runnerState) {
          throw new Error("Invariant violation: \"runnerState\"");
        }

        expect(runnerState.enabled).toEqual(true);
        expect(runnerState.tasks[0].type).toEqual('test task');
      });
    });
  });
  describe('SET_STATES_FOR_TASK_RUNNERS', () => {
    let state;
    let newStates;
    beforeEach(() => {
      const disabledTaskRunner = new (dummy().TaskRunner)('a');
      const loPriTaskRunner = new (dummy().TaskRunner)('b');
      let hiPriTaskRunner = new (dummy().TaskRunner)('c');
      hiPriTaskRunner = Object.assign({}, hiPriTaskRunner, {
        getPriority: () => 1
      });
      newStates = Immutable().Map([[disabledTaskRunner, {
        enabled: false,
        tasks: []
      }], [loPriTaskRunner, {
        enabled: true,
        tasks: []
      }], [hiPriTaskRunner, {
        enabled: true,
        tasks: []
      }]]);
      state = {
        projectRoot: 'foo',
        taskRunners: Immutable().List([disabledTaskRunner, loPriTaskRunner, hiPriTaskRunner]),
        statesForTaskRunners: newStates
      };
    });
    describe("if this working root doesn't have a preference", () => {
      it('selects an enabled runner with the highest priority', async () => {
        const output = await runActions([Actions().setStatesForTaskRunners(newStates)], state).toArray().toPromise();
        expect(output.length).toEqual(2);
        const action = output[0];

        if (!(action.type === Actions().SELECT_TASK_RUNNER)) {
          throw new Error("Invariant violation: \"action.type === Actions.SELECT_TASK_RUNNER\"");
        }

        if (!action.payload.taskRunner) {
          throw new Error("Invariant violation: \"action.payload.taskRunner\"");
        }

        expect(action.payload.taskRunner.id).toEqual('c');
      });
      it('shows the toolbar since it might be useful', async () => {
        const output = await runActions([Actions().setStatesForTaskRunners(newStates)], state).toArray().toPromise();
        expect(output.length).toEqual(2);
        const action = output[1];

        if (!(action.type === Actions().SET_TOOLBAR_VISIBILITY)) {
          throw new Error("Invariant violation: \"action.type === Actions.SET_TOOLBAR_VISIBILITY\"");
        }

        expect(action.payload.updateUserPreferences).toEqual(true);
        expect(action.payload.visible).toEqual(true);
      });
    });
    describe('if this root has a preference', () => {
      let preference;
      beforeEach(() => {
        preference = {
          taskRunnerId: 'b',
          visible: true
        };
      });
      it('restores task runner and visibility based on the preference', async () => {
        const output = await runActions([Actions().setStatesForTaskRunners(newStates)], state, createMockPreferences([{
          key: 'foo',
          value: preference
        }])).toArray().toPromise();
        expect(output.length).toEqual(2);
        const taskRunnerAction = output[0];
        const visibilityAction = output[1];

        if (!(taskRunnerAction.type === Actions().SELECT_TASK_RUNNER)) {
          throw new Error("Invariant violation: \"taskRunnerAction.type === Actions.SELECT_TASK_RUNNER\"");
        }

        if (!(visibilityAction.type === Actions().SET_TOOLBAR_VISIBILITY)) {
          throw new Error("Invariant violation: \"visibilityAction.type === Actions.SET_TOOLBAR_VISIBILITY\"");
        }

        if (!taskRunnerAction.payload.taskRunner) {
          throw new Error("Invariant violation: \"taskRunnerAction.payload.taskRunner\"");
        }

        expect(taskRunnerAction.payload.taskRunner.id).toEqual('b');
        expect(visibilityAction.payload.visible).toEqual(true);
        expect(visibilityAction.payload.updateUserPreferences).toEqual(false);
      });
    });
  });
  describe('SET_CONSOLE_SERVICE', () => {
    describe('if the console service is null', () => {
      it('does nothing', async () => {
        const state = {
          consoleService: null,
          initialPackagesActivated: true
        };
        const output = await runActions([Actions().setConsoleService(null)], state).toArray().toPromise();
        expect(output).toEqual([]);
      });
    });
    describe('if the console service exists', () => {
      it('sets consoles for all registered task runners', async () => {
        const state = {
          consoleService: createMockConsole,
          initialPackagesActivated: true,
          taskRunners: Immutable().List([new (dummy().TaskRunner)()])
        };
        const output = await runActions([Actions().setConsoleService(createMockConsole)], state).toArray().toPromise();
        expect(output.length).toEqual(1);
        const setConsolesAction = output[0];

        if (!(setConsolesAction.type === Actions().SET_CONSOLES_FOR_TASK_RUNNERS)) {
          throw new Error("Invariant violation: \"setConsolesAction.type === Actions.SET_CONSOLES_FOR_TASK_RUNNERS\"");
        }

        const {
          consolesForTaskRunners
        } = setConsolesAction.payload;
        expect(consolesForTaskRunners.count()).toEqual(1);
      });
    });
  });
  describe('DID_ACTIVATE_INITIAL_PACKAGES', () => {
    it('sends another project root message', async () => {
      const mockProjectRoot = 'foo';
      const state = {
        consoleService: null,
        initialPackagesActivated: true,
        taskRunners: Immutable().List(),
        projectRoot: mockProjectRoot
      };
      const output = await runActions([Actions().didActivateInitialPackages()], state).toArray().toPromise();
      expect(output.length).toEqual(1);
      const setProjectRootAction = output[0];

      if (!(setProjectRootAction.type === Actions().SET_STATES_FOR_TASK_RUNNERS)) {
        throw new Error("Invariant violation: \"setProjectRootAction.type === Actions.SET_STATES_FOR_TASK_RUNNERS\"");
      }

      expect(setProjectRootAction.payload.statesForTaskRunners.count()).toEqual(0);
    });
  });
  describe('REGISTER_TASK_RUNNER', () => {
    describe('if the console service is null', () => {
      it('sets the state for the task runner', async () => {
        await (async () => {
          const taskRunner = new (dummy().TaskRunner)();
          const task = new (dummy().createTask)('test task');
          const mockTaskRunner = Object.assign({}, taskRunner, {
            setProjectRoot: (projectRoot, callback) => {
              callback(true, [task]);
              return new (_UniversalDisposable().default)();
            }
          });
          const state = {
            consoleService: null,
            initialPackagesActivated: true,
            projectRoot: 'foo'
          };
          const output = await runActions([Actions().registerTaskRunner(mockTaskRunner)], state).first().toPromise();

          if (!(output.type === Actions().SET_STATE_FOR_TASK_RUNNER)) {
            throw new Error("Invariant violation: \"output.type === Actions.SET_STATE_FOR_TASK_RUNNER\"");
          }

          expect(output.payload.taskRunner).toEqual(mockTaskRunner);
          const taskRunnerState = output.payload.taskRunnerState;
          expect(taskRunnerState.enabled).toEqual(true);
          expect(taskRunnerState.tasks.length).toEqual(1);
          expect(taskRunnerState.tasks[0]).toEqual(task);
        })();
      });
    });
    describe('if the task runners arent ready', () => {
      it('sets the console service for the runner', async () => {
        const state = {
          consoleService: createMockConsole,
          initialPackagesActivated: false,
          projectRoot: 'foo'
        };
        const mockTaskRunner = new (dummy().TaskRunner)();
        const output = await runActions([Actions().registerTaskRunner(mockTaskRunner)], state).toArray().toPromise();
        expect(output.length).toEqual(1);
        const addConsoleAction = output[0];

        if (!(addConsoleAction.type === Actions().ADD_CONSOLE_FOR_TASK_RUNNER)) {
          throw new Error("Invariant violation: \"addConsoleAction.type === Actions.ADD_CONSOLE_FOR_TASK_RUNNER\"");
        }

        expect(addConsoleAction.payload.taskRunner).toEqual(mockTaskRunner);
      });
    });
    describe('if the task runners are ready and the console service exists', () => {
      it('sets the project root for new task runner, sets consoles for all registered task runners', async () => {
        await (async () => {
          const taskRunner = new (dummy().TaskRunner)();
          const task = new (dummy().createTask)('test task');
          const mockTaskRunner = Object.assign({}, taskRunner, {
            setProjectRoot: (projectRoot, callback) => {
              callback(true, [task]);
              return new (_UniversalDisposable().default)();
            }
          });
          const state = {
            consoleService: createMockConsole,
            projectRoot: 'foo',
            initialPackagesActivated: true,
            taskRunners: Immutable().List([])
          };
          const [addConsoleAction, setStateAction] = await runActions([Actions().registerTaskRunner(mockTaskRunner)], state).take(2).toArray().toPromise();

          if (!(addConsoleAction.type === Actions().ADD_CONSOLE_FOR_TASK_RUNNER)) {
            throw new Error("Invariant violation: \"addConsoleAction.type === Actions.ADD_CONSOLE_FOR_TASK_RUNNER\"");
          }

          expect(addConsoleAction.payload.taskRunner).toEqual(mockTaskRunner);
          expect(Object.getOwnPropertyNames(addConsoleAction.payload.consoleApi).length).toEqual(0);

          if (!(setStateAction.type === Actions().SET_STATE_FOR_TASK_RUNNER)) {
            throw new Error("Invariant violation: \"setStateAction.type === Actions.SET_STATE_FOR_TASK_RUNNER\"");
          }

          expect(setStateAction.payload.taskRunner).toEqual(mockTaskRunner);
          const taskRunnerState = setStateAction.payload.taskRunnerState;
          expect(taskRunnerState.enabled).toEqual(true);
          expect(taskRunnerState.tasks.length).toEqual(1);
          expect(taskRunnerState.tasks[0]).toEqual(task);
        })();
      });
    });
  });
  describe('UNREGISTER_TASK_RUNNER', () => {
    describe('if the console service is null', () => {
      it('does nothing', async () => {
        const taskRunner = new (dummy().TaskRunner)();
        const state = {
          consoleService: null,
          initialPackagesActivated: true,
          taskRunners: Immutable().List([taskRunner]),
          projectRoot: 'foo'
        };
        const output = await runActions([Actions().unregisterTaskRunner(taskRunner)], state).toArray().toPromise();
        expect(output.length).toEqual(0);
      });
    });
    describe('if the task runner to be removed is the active task runner', () => {
      it('removes the active task runner and the old task runner console', async () => {
        const taskRunner = new (dummy().TaskRunner)();
        const state = {
          consoleService: createMockConsole,
          initialPackagesActivated: true,
          taskRunners: Immutable().List([taskRunner]),
          activeTaskRunner: taskRunner
        };
        const output = await runActions([Actions().unregisterTaskRunner(taskRunner)], state).toArray().toPromise();
        const removeConsoleAction = output[0];
        const setTaskRunnerAction = output[1];
        expect(removeConsoleAction.type).toEqual(Actions().REMOVE_CONSOLE_FOR_TASK_RUNNER);

        if (!(removeConsoleAction.type === Actions().REMOVE_CONSOLE_FOR_TASK_RUNNER)) {
          throw new Error("Invariant violation: \"removeConsoleAction.type === Actions.REMOVE_CONSOLE_FOR_TASK_RUNNER\"");
        }

        expect(removeConsoleAction.payload.taskRunner).toEqual(taskRunner);
        expect(setTaskRunnerAction.type).toEqual(Actions().SELECT_TASK_RUNNER);

        if (!(setTaskRunnerAction.type === Actions().SELECT_TASK_RUNNER)) {
          throw new Error("Invariant violation: \"setTaskRunnerAction.type === Actions.SELECT_TASK_RUNNER\"");
        }

        expect(setTaskRunnerAction.payload.taskRunner).toEqual(null);
        expect(setTaskRunnerAction.payload.updateUserPreferences).toEqual(false);
      });
    });
    describe('if the console service exists', () => {
      it('sets consoles for all registered task runners', async () => {
        const mockProjectRoot = 'foo';
        const taskRunner = new (dummy().TaskRunner)();
        const state = {
          consoleService: createMockConsole,
          projectRoot: mockProjectRoot,
          initialPackagesActivated: true,
          taskRunners: Immutable().List([taskRunner])
        };
        const output = await runActions([Actions().unregisterTaskRunner(taskRunner)], state).toArray().toPromise();
        expect(output.length).toEqual(1);
        const removeConsoleAction = output[0];

        if (!(removeConsoleAction.type === Actions().REMOVE_CONSOLE_FOR_TASK_RUNNER)) {
          throw new Error("Invariant violation: \"removeConsoleAction.type === Actions.REMOVE_CONSOLE_FOR_TASK_RUNNER\"");
        }

        expect(removeConsoleAction.payload.taskRunner).toEqual(taskRunner);
      });
    });
  });
  describe('TASK_STOPPED', () => {
    it('cancels the current task', async () => {
      const task = (0, _tasks().taskFromObservable)(new _rxjsCompatUmdMin.Subject());
      const taskRunner = new (dummy().TaskRunner)();
      jest.spyOn(taskRunner, 'runTask').mockReturnValue(task);
      jest.spyOn(task, 'cancel').mockImplementation(() => {});
      const state = {
        activeTaskRunner: taskRunner,
        taskRunners: Immutable().List([taskRunner])
      };
      const taskMeta = dummy().createTask('test');
      const actions = [Actions().runTask(Object.assign({}, taskMeta, {
        taskRunner
      }), false), {
        type: Actions().TASK_STOPPED,
        payload: {
          taskStatus: {
            metadata: taskMeta,
            task,
            progress: 1,
            status: null,
            startDate: new Date()
          },
          taskRunner
        }
      }];
      await runActions(actions, state).toArray().toPromise();
      expect(task.cancel).toHaveBeenCalled();
    });
  });
  describe('RUN_TASK', () => {
    it('runs a task to completion', async () => {
      const taskRunner = new (dummy().TaskRunner)();
      const taskEvents = new _rxjsCompatUmdMin.Subject();
      const task = (0, _tasks().taskFromObservable)(taskEvents);
      jest.spyOn(task, 'cancel').mockImplementation(() => {});
      jest.spyOn(task, 'onDidComplete');
      jest.spyOn(taskRunner, 'runTask').mockReturnValue(task);
      const state = {
        activeTaskRunner: taskRunner,
        taskRunners: Immutable().List([taskRunner])
      };
      const taskMeta = dummy().createTask('test');
      const output = runActions([Actions().runTask(Object.assign({}, taskMeta, {
        taskRunner
      }), false)], state);
      expect(task.onDidComplete).toHaveBeenCalled();
      taskEvents.complete();
      const result = await output.toArray().toPromise();
      expect(result.map(action => action.type).slice(-2)).toEqual([Actions().TASK_STARTED, Actions().TASK_COMPLETED]);
      expect(task.cancel).not.toHaveBeenCalled();
    });
  });
});

function createMockStore(state) {
  const store = {
    getState: () => state
  };
  return store;
}

function runActions(actions, initialState, preferencesForWorkingRoots = createMockPreferences([])) {
  const store = createMockStore(initialState);
  const input = new _rxjsCompatUmdMin.Subject();
  const output = new _rxjsCompatUmdMin.ReplaySubject();
  const options = {
    preferencesForWorkingRoots,
    states: _rxjsCompatUmdMin.Observable.never()
  };
  getRootEpic()(new (_reduxObservable().ActionsObservable)(input), store, options).subscribe(output);
  actions.forEach(input.next.bind(input));
  input.complete();
  return output;
}

function createMockPreferences(db) {
  return new (dummy().ToolbarStatePreferences)(db);
}

function createMockConsole(source) {
  const consoleApi = {};
  return consoleApi;
}