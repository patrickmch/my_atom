"use strict";

module.exports = _client => {
  const remoteModule = {};

  remoteModule.getDebuggerArgs = function (arg0) {
    return _client.callRemoteFunction("HhvmDebuggerService/getDebuggerArgs", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "config",
      type: {
        kind: "union",
        types: [{
          kind: "object",
          fields: [{
            name: "action",
            type: {
              kind: "string-literal",
              value: "attach"
            },
            optional: false
          }, {
            name: "targetUri",
            type: {
              kind: "named",
              name: "NuclideUri"
            },
            optional: false
          }, {
            name: "startupDocumentPath",
            type: {
              kind: "string"
            },
            optional: true
          }, {
            name: "debugPort",
            type: {
              kind: "number"
            },
            optional: true
          }]
        }, {
          kind: "object",
          fields: [{
            name: "action",
            type: {
              kind: "string-literal",
              value: "launch"
            },
            optional: false
          }, {
            name: "targetUri",
            type: {
              kind: "named",
              name: "NuclideUri"
            },
            optional: false
          }, {
            name: "startupDocumentPath",
            type: {
              kind: "string"
            },
            optional: true
          }, {
            name: "launchScriptPath",
            type: {
              kind: "named",
              name: "NuclideUri"
            },
            optional: false
          }, {
            name: "scriptArgs",
            type: {
              kind: "array",
              type: {
                kind: "string"
              }
            },
            optional: false
          }, {
            name: "hhvmRuntimePath",
            type: {
              kind: "string"
            },
            optional: true
          }, {
            name: "hhvmRuntimeArgs",
            type: {
              kind: "array",
              type: {
                kind: "string"
              }
            },
            optional: false
          }, {
            name: "deferLaunch",
            type: {
              kind: "boolean"
            },
            optional: false
          }, {
            name: "launchWrapperCommand",
            type: {
              kind: "string"
            },
            optional: true
          }, {
            name: "cwd",
            type: {
              kind: "string"
            },
            optional: true
          }, {
            name: "noDebug",
            type: {
              kind: "boolean"
            },
            optional: true
          }]
        }],
        discriminantField: "action"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "named",
        name: "Object"
      });
    });
  };

  remoteModule.getLaunchArgs = function (arg0) {
    return _client.callRemoteFunction("HhvmDebuggerService/getLaunchArgs", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "config",
      type: {
        kind: "named",
        name: "HHVMLaunchConfig"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "named",
        name: "Object"
      });
    });
  };

  remoteModule.getHhvmStackTraces = function () {
    return _client.callRemoteFunction("HhvmDebuggerService/getHhvmStackTraces", "promise", _client.marshalArguments(Array.from(arguments), [])).then(value => {
      return _client.unmarshal(value, {
        kind: "array",
        type: {
          kind: "string"
        }
      });
    });
  };

  remoteModule.createLogFilePaste = function () {
    return _client.callRemoteFunction("HhvmDebuggerService/createLogFilePaste", "promise", _client.marshalArguments(Array.from(arguments), [])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.getAttachTargetList = function () {
    return _client.callRemoteFunction("HhvmDebuggerService/getAttachTargetList", "promise", _client.marshalArguments(Array.from(arguments), [])).then(value => {
      return _client.unmarshal(value, {
        kind: "array",
        type: {
          kind: "object",
          fields: [{
            name: "pid",
            type: {
              kind: "number"
            },
            optional: false
          }, {
            name: "command",
            type: {
              kind: "string"
            },
            optional: false
          }]
        }
      });
    });
  };

  return remoteModule;
};

Object.defineProperty(module.exports, "defs", {
  value: {
    Object: {
      kind: "alias",
      name: "Object",
      location: {
        type: "builtin"
      }
    },
    Date: {
      kind: "alias",
      name: "Date",
      location: {
        type: "builtin"
      }
    },
    RegExp: {
      kind: "alias",
      name: "RegExp",
      location: {
        type: "builtin"
      }
    },
    Buffer: {
      kind: "alias",
      name: "Buffer",
      location: {
        type: "builtin"
      }
    },
    "fs.Stats": {
      kind: "alias",
      name: "fs.Stats",
      location: {
        type: "builtin"
      }
    },
    NuclideUri: {
      kind: "alias",
      name: "NuclideUri",
      location: {
        type: "builtin"
      }
    },
    atom$Point: {
      kind: "alias",
      name: "atom$Point",
      location: {
        type: "builtin"
      }
    },
    atom$Range: {
      kind: "alias",
      name: "atom$Range",
      location: {
        type: "builtin"
      }
    },
    HHVMAttachConfig: {
      kind: "alias",
      location: {
        type: "source",
        fileName: "types.js",
        line: 28
      },
      name: "HHVMAttachConfig",
      definition: {
        kind: "object",
        fields: [{
          name: "action",
          type: {
            kind: "string-literal",
            value: "attach"
          },
          optional: false
        }, {
          name: "targetUri",
          type: {
            kind: "named",
            name: "NuclideUri"
          },
          optional: false
        }, {
          name: "startupDocumentPath",
          type: {
            kind: "string"
          },
          optional: true
        }, {
          name: "debugPort",
          type: {
            kind: "number"
          },
          optional: true
        }]
      }
    },
    HHVMLaunchConfig: {
      kind: "alias",
      location: {
        type: "source",
        fileName: "types.js",
        line: 14
      },
      name: "HHVMLaunchConfig",
      definition: {
        kind: "object",
        fields: [{
          name: "action",
          type: {
            kind: "string-literal",
            value: "launch"
          },
          optional: false
        }, {
          name: "targetUri",
          type: {
            kind: "named",
            name: "NuclideUri"
          },
          optional: false
        }, {
          name: "startupDocumentPath",
          type: {
            kind: "string"
          },
          optional: true
        }, {
          name: "launchScriptPath",
          type: {
            kind: "named",
            name: "NuclideUri"
          },
          optional: false
        }, {
          name: "scriptArgs",
          type: {
            kind: "array",
            type: {
              kind: "string"
            }
          },
          optional: false
        }, {
          name: "hhvmRuntimePath",
          type: {
            kind: "string"
          },
          optional: true
        }, {
          name: "hhvmRuntimeArgs",
          type: {
            kind: "array",
            type: {
              kind: "string"
            }
          },
          optional: false
        }, {
          name: "deferLaunch",
          type: {
            kind: "boolean"
          },
          optional: false
        }, {
          name: "launchWrapperCommand",
          type: {
            kind: "string"
          },
          optional: true
        }, {
          name: "cwd",
          type: {
            kind: "string"
          },
          optional: true
        }, {
          name: "noDebug",
          type: {
            kind: "boolean"
          },
          optional: true
        }]
      }
    },
    getDebuggerArgs: {
      kind: "function",
      name: "getDebuggerArgs",
      location: {
        type: "source",
        fileName: "main.js",
        line: 29
      },
      type: {
        location: {
          type: "source",
          fileName: "main.js",
          line: 29
        },
        kind: "function",
        argumentTypes: [{
          name: "config",
          type: {
            kind: "union",
            types: [{
              kind: "object",
              fields: [{
                name: "action",
                type: {
                  kind: "string-literal",
                  value: "attach"
                },
                optional: false
              }, {
                name: "targetUri",
                type: {
                  kind: "named",
                  name: "NuclideUri"
                },
                optional: false
              }, {
                name: "startupDocumentPath",
                type: {
                  kind: "string"
                },
                optional: true
              }, {
                name: "debugPort",
                type: {
                  kind: "number"
                },
                optional: true
              }]
            }, {
              kind: "object",
              fields: [{
                name: "action",
                type: {
                  kind: "string-literal",
                  value: "launch"
                },
                optional: false
              }, {
                name: "targetUri",
                type: {
                  kind: "named",
                  name: "NuclideUri"
                },
                optional: false
              }, {
                name: "startupDocumentPath",
                type: {
                  kind: "string"
                },
                optional: true
              }, {
                name: "launchScriptPath",
                type: {
                  kind: "named",
                  name: "NuclideUri"
                },
                optional: false
              }, {
                name: "scriptArgs",
                type: {
                  kind: "array",
                  type: {
                    kind: "string"
                  }
                },
                optional: false
              }, {
                name: "hhvmRuntimePath",
                type: {
                  kind: "string"
                },
                optional: true
              }, {
                name: "hhvmRuntimeArgs",
                type: {
                  kind: "array",
                  type: {
                    kind: "string"
                  }
                },
                optional: false
              }, {
                name: "deferLaunch",
                type: {
                  kind: "boolean"
                },
                optional: false
              }, {
                name: "launchWrapperCommand",
                type: {
                  kind: "string"
                },
                optional: true
              }, {
                name: "cwd",
                type: {
                  kind: "string"
                },
                optional: true
              }, {
                name: "noDebug",
                type: {
                  kind: "boolean"
                },
                optional: true
              }]
            }],
            discriminantField: "action"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "named",
            name: "Object"
          }
        }
      }
    },
    getLaunchArgs: {
      kind: "function",
      name: "getLaunchArgs",
      location: {
        type: "source",
        fileName: "main.js",
        line: 55
      },
      type: {
        location: {
          type: "source",
          fileName: "main.js",
          line: 55
        },
        kind: "function",
        argumentTypes: [{
          name: "config",
          type: {
            kind: "named",
            name: "HHVMLaunchConfig"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "named",
            name: "Object"
          }
        }
      }
    },
    getHhvmStackTraces: {
      kind: "function",
      name: "getHhvmStackTraces",
      location: {
        type: "source",
        fileName: "main.js",
        line: 180
      },
      type: {
        location: {
          type: "source",
          fileName: "main.js",
          line: 180
        },
        kind: "function",
        argumentTypes: [],
        returnType: {
          kind: "promise",
          type: {
            kind: "array",
            type: {
              kind: "string"
            }
          }
        }
      }
    },
    createLogFilePaste: {
      kind: "function",
      name: "createLogFilePaste",
      location: {
        type: "source",
        fileName: "main.js",
        line: 189
      },
      type: {
        location: {
          type: "source",
          fileName: "main.js",
          line: 189
        },
        kind: "function",
        argumentTypes: [],
        returnType: {
          kind: "promise",
          type: {
            kind: "string"
          }
        }
      }
    },
    getAttachTargetList: {
      kind: "function",
      name: "getAttachTargetList",
      location: {
        type: "source",
        fileName: "main.js",
        line: 274
      },
      type: {
        location: {
          type: "source",
          fileName: "main.js",
          line: 274
        },
        kind: "function",
        argumentTypes: [],
        returnType: {
          kind: "promise",
          type: {
            kind: "array",
            type: {
              kind: "object",
              fields: [{
                name: "pid",
                type: {
                  kind: "number"
                },
                optional: false
              }, {
                name: "command",
                type: {
                  kind: "string"
                },
                optional: false
              }]
            }
          }
        }
      }
    }
  }
});