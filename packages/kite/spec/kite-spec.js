'use strict';

const http = require('http');
const path = require('path');
const {Installation} = require('kite-installer');
const {fakeKiteInstallPaths, withKiteWhitelistedPaths, sleep, withFakeServer, fakeResponse} = require('./spec-helpers');

const projectPath = path.join(__dirname, 'fixtures');

describe('Kite', () => {
  let workspaceElement, jasmineContent, notificationsPkg, kitePkg, editor;

  fakeKiteInstallPaths();

  beforeEach(() => {
    jasmineContent = document.querySelector('#jasmine-content');
    workspaceElement = atom.views.getView(atom.workspace);

    atom.config.set('kite.showKiteTourOnStartup', false);

    jasmineContent.appendChild(workspaceElement);

    waitsForPromise(() => atom.packages.activatePackage('notifications').then(pkg => {
      notificationsPkg = pkg.mainModule;
      notificationsPkg.initializeIfNotInitialized();
    }));
  });

  afterEach(() => {
    notificationsPkg.lastNotification = null;
    atom.notifications.clear();
  });

  describe('with Kite not installed yet', () => {
    withFakeServer([[
      o => o.path === '/atom/events',
      o => fakeResponse(200, JSON.stringify({
        decision: true,
        variant: {
          buttonPosition: 'top',
          installCopy: 'short',
          installTitle: 'choose',
          showKiteLogo: 'yes',
          showScreenshot: 'no',
        },
      })),
    ]], () => {
      beforeEach(() => {
        localStorage.setItem('kite.wasInstalled', false);
        waitsForPromise(() => atom.packages.activatePackage('kite').then(pkg => {
          kitePkg = pkg.mainModule;
        }));
      });

      it('opens the install flow in a new tab', () => {
        const item = atom.workspace.getActivePaneItem();
        expect(item instanceof Installation).toBeTruthy();
      });

      it('places the flow in the create account step', () => {
        const item = atom.workspace.getActivePaneItem();
        const view = atom.views.getView(item);

        expect(view.querySelector('.create-account-step:not(.hidden)')).toExist();
      });
    });
  });

  describe('with the current project path not in the whitelist', () => {
    withKiteWhitelistedPaths(() => {
      describe('when activated', () => {
        describe('and there is no file open', () => {
          beforeEach(() => {
            waitsForPromise(() => atom.packages.activatePackage('kite').then(pkg => {
              kitePkg = pkg.mainModule;
            }));
          });

          it('does not notify the user', () => {
            expect(workspaceElement.querySelector('atom-notification')).not.toExist();
          });

          describe('opening a supported file', () => {
            beforeEach(() => {
              waitsForPromise(() => atom.workspace.open('sample.py').then(e => {
                editor = e;
              }));
              waitsFor('kite editor', () => kitePkg.kiteEditorForEditor(editor));
              runs(() => {
                const v = atom.views.getView(editor);
                v.dispatchEvent(new Event('focus'));
                advanceClock(200);
                advanceClock(100);
              });
              waitsFor('notify endpoint call', () => {
                const {path} = http.request.mostRecentCall.args[0];
                return /^\/clientapi\/permissions/.test(path);
              });
              sleep(100);
            });

            it('notifies the user', () => {
              expect(workspaceElement.querySelector('atom-notification')).toExist();
            });

            it('subscribes to the editor events', () => {
              expect(kitePkg.hasEditorSubscription(editor)).toBeTruthy();
            });
          });

          describe('opening an unsupported file', () => {
            beforeEach(() => {
              waitsForPromise(() => atom.workspace.open('hello.json'));
            });

            it('does not notifiy the user', () => {
              expect(workspaceElement.querySelector('atom-notification')).not.toExist();
            });
          });

          describe('opening a file without path', () => {
            beforeEach(() => {
              waitsForPromise(() => atom.workspace.open());
            });

            it('does not notify the user', () => {
              expect(workspaceElement.querySelector('atom-notification')).not.toExist();
            });

            describe('when the file is saved', () => {
              let editor;
              describe('as a supported file', () => {
                beforeEach(() => {
                  editor = atom.workspace.getActiveTextEditor();
                  spyOn(editor, 'getPath')
                  .andReturn(path.join(projectPath, 'file.py'));
                  editor.emitter.emit('did-change-path', editor.getPath());
                  advanceClock(200);
                  sleep(100);
                  runs(() => {
                    advanceClock(200);
                  });
                });

                xit('notifies the user', () => {
                  waitsFor('notification', () => workspaceElement.querySelector('atom-notification'));
                });

                it('subscribes to the editor events', () => {
                  expect(kitePkg.hasEditorSubscription(editor)).toBeTruthy();
                });
              });

              describe('as an unsupported file', () => {
                beforeEach(() => {
                  editor = atom.workspace.getActiveTextEditor();
                  spyOn(editor, 'getPath')
                  .andReturn(path.join(projectPath, 'file.json'));
                  editor.emitter.emit('did-change-path', editor.getPath());
                });

                xit('notifies the user', () => {
                  sleep(100);
                  runs(() => {
                    expect(workspaceElement.querySelector('atom-notification')).toExist();
                  });
                });
              });
            });
          });
        });

        describe('and there is a supported file open', () => {
          beforeEach(() => {
            waitsForPromise(() => atom.workspace.open('sample.py').then(e => {
              editor = e;
            }));
            waitsForPromise(() => atom.packages.activatePackage('kite').then(pkg => {
              kitePkg = pkg.mainModule;
            }));
            runs(() => {
              const v = atom.views.getView(editor);
              v.dispatchEvent(new Event('focus'));
            });
            waitsFor('kite editor', () => kitePkg.kiteEditorForEditor(editor));
            runs(() => {
              advanceClock(200);
              advanceClock(100);
            });
            waitsFor('notify endpoint call', () => {
              const {path} = http.request.mostRecentCall.args[0];
              return /^\/clientapi\/permissions/.test(path);
            });
            sleep(100);
          });

          it('notifies the user', () => {
            expect(workspaceElement.querySelector('atom-notification')).toExist();
          });

          it('subscribes to the editor events', () => {
            sleep(100);
            runs(() => {
              expect(kitePkg.hasEditorSubscription(editor)).toBeTruthy();
            });
          });
        });

        describe('and there is a file without path open', () => {
          beforeEach(() => {
            waitsForPromise(() => atom.workspace.open());
            waitsForPromise(() => atom.packages.activatePackage('kite').then(pkg => {
              kitePkg = pkg.mainModule;
            }));
          });

          it('does not notify the user', () => {
            expect(workspaceElement.querySelector('atom-notification')).not.toExist();
          });
        });

        describe('and there is an unsupported file open', () => {
          beforeEach(() => {
            waitsForPromise(() => atom.workspace.open('hello.json'));
            waitsForPromise(() => atom.packages.activatePackage('kite').then(pkg => {
              kitePkg = pkg.mainModule;
            }));
          });

          it('does not notify the user', () => {
            expect(workspaceElement.querySelector('atom-notification')).not.toExist();
          });
        });
      });
    });
  });

  describe('with the current project path in the whitelist', () => {
    withKiteWhitelistedPaths([projectPath], () => {
      describe('when activated', () => {
        describe('and there is no file open', () => {
          beforeEach(() => {
            waitsForPromise(() => atom.packages.activatePackage('kite').then(pkg => {
              kitePkg = pkg.mainModule;
            }));
          });

          it('does not notify the user', () => {
            expect(workspaceElement.querySelector('atom-notification')).not.toExist();
          });

          describe('opening a file without path', () => {
            beforeEach(() => {
              waitsForPromise(() => atom.workspace.open());
            });

            it('does not notify the user', () => {
              expect(workspaceElement.querySelector('atom-notification')).not.toExist();
            });

            describe('when the file is saved', () => {
              let editor;
              describe('as a supported file', () => {
                beforeEach(() => {
                  editor = atom.workspace.getActiveTextEditor();
                  spyOn(editor, 'getPath')
                  .andReturn(path.join(projectPath, 'file.py'));
                  editor.emitter.emit('did-change-path', editor.getPath());
                });

                it('does not notify the user', () => {
                  sleep(100);
                  runs(() => {
                    expect(workspaceElement.querySelector('atom-notification')).not.toExist();
                  });
                });

                it('subscribes to the editor events', () => {
                  sleep(100);
                  runs(() => {
                    const editor = atom.workspace.getActiveTextEditor();
                    expect(kitePkg.hasEditorSubscription(editor)).toBeTruthy();
                  });
                });
              });

              describe('as an unsupported file', () => {
                beforeEach(() => {
                  editor = atom.workspace.getActiveTextEditor();
                  spyOn(editor, 'getPath')
                  .andReturn(path.join(projectPath, 'file.json'));
                  editor.emitter.emit('did-change-path', editor.getPath());
                });

                it('does not notify the user', () => {
                  sleep(100);
                  runs(() => {
                    expect(workspaceElement.querySelector('atom-notification')).not.toExist();
                  });
                });
              });
            });
          });
        });

        describe('and there is a supported file open', () => {
          beforeEach(() => {
            waitsForPromise(() => atom.workspace.open('sample.py').then(e => {
              editor = e;
            }));
            waitsForPromise(() => atom.packages.activatePackage('kite').then(pkg => {
              kitePkg = pkg.mainModule;
            }));
            runs(() => {
              const v = atom.views.getView(editor);
              v.dispatchEvent(new Event('focus'));
            });
            waitsFor('kite editor', () => kitePkg.kiteEditorForEditor(editor));
            runs(() => advanceClock(200));
          });

          it('does not notify the user', () => {
            expect(workspaceElement.querySelector('atom-notification')).not.toExist();
          });

          it('subscribes to the editor events', () => {
            expect(kitePkg.hasEditorSubscription(editor)).toBeTruthy();
          });

          describe('when the file path is changed', () => {
            describe('as an unsupported file', () => {
              beforeEach(() => {
                spyOn(editor, 'getPath')
                .andReturn(path.join(projectPath, 'file.json'));
                editor.emitter.emit('did-change-path', editor.getPath());
              });

              it('unsubscribes from the editor events', () => {
                sleep(100);
                runs(() => {
                  expect(kitePkg.hasEditorSubscription(editor)).toBeFalsy();
                });
              });
            });
          });
        });

        describe('and there is an unsupported file open', () => {
          beforeEach(() => {
            waitsForPromise(() => atom.workspace.open('hello.json'));
            waitsForPromise(() => atom.packages.activatePackage('kite').then(pkg => {
              kitePkg = pkg.mainModule;
            }));
          });

          it('does not notify the user', () => {
            expect(workspaceElement.querySelector('atom-notification')).not.toExist();
          });
        });
      });
    });
  });

});
