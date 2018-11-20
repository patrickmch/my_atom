"use strict";

module.exports = _client => {
  const remoteModule = {};

  remoteModule.getDeviceInfo = function (arg0) {
    return _client.callRemoteFunction("AdbService/getDeviceInfo", "observable", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }])).map(value => {
      return _client.unmarshal(value, {
        kind: "map",
        keyType: {
          kind: "string"
        },
        valueType: {
          kind: "string"
        }
      });
    }).publish();
  };

  remoteModule.getProcesses = function (arg0, arg1) {
    return _client.callRemoteFunction("AdbService/getProcesses", "observable", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "timeout",
      type: {
        kind: "number"
      }
    }])).map(value => {
      return _client.unmarshal(value, {
        kind: "array",
        type: {
          kind: "named",
          name: "Process"
        }
      });
    }).publish();
  };

  remoteModule.stopProcess = function (arg0, arg1, arg2) {
    return _client.callRemoteFunction("AdbService/stopProcess", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "packageName",
      type: {
        kind: "string"
      }
    }, {
      name: "pid",
      type: {
        kind: "number"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "void"
      });
    });
  };

  remoteModule.getDeviceList = function () {
    return _client.callRemoteFunction("AdbService/getDeviceList", "promise", _client.marshalArguments(Array.from(arguments), [])).then(value => {
      return _client.unmarshal(value, {
        kind: "array",
        type: {
          kind: "named",
          name: "AdbDevice"
        }
      });
    });
  };

  remoteModule.getPidFromPackageName = function (arg0, arg1) {
    return _client.callRemoteFunction("AdbService/getPidFromPackageName", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "packageName",
      type: {
        kind: "string"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "number"
      });
    });
  };

  remoteModule.installPackage = function (arg0, arg1) {
    return _client.callRemoteFunction("AdbService/installPackage", "observable", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "packagePath",
      type: {
        kind: "named",
        name: "NuclideUri"
      }
    }])).map(value => {
      return _client.unmarshal(value, {
        kind: "named",
        name: "ProcessMessage"
      });
    }).publish();
  };

  remoteModule.uninstallPackage = function (arg0, arg1) {
    return _client.callRemoteFunction("AdbService/uninstallPackage", "observable", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "packageName",
      type: {
        kind: "string"
      }
    }])).map(value => {
      return _client.unmarshal(value, {
        kind: "named",
        name: "LegacyProcessMessage"
      });
    }).publish();
  };

  remoteModule.forwardJdwpPortToPid = function (arg0, arg1, arg2) {
    return _client.callRemoteFunction("AdbService/forwardJdwpPortToPid", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "tcpPort",
      type: {
        kind: "number"
      }
    }, {
      name: "pid",
      type: {
        kind: "number"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "nullable",
        type: {
          kind: "string"
        }
      });
    });
  };

  remoteModule.removeJdwpForwardSpec = function (arg0, arg1) {
    return _client.callRemoteFunction("AdbService/removeJdwpForwardSpec", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "spec",
      type: {
        kind: "nullable",
        type: {
          kind: "string"
        }
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.launchActivity = function (arg0, arg1, arg2, arg3, arg4, arg5) {
    return _client.callRemoteFunction("AdbService/launchActivity", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "packageName",
      type: {
        kind: "string"
      }
    }, {
      name: "activity",
      type: {
        kind: "string"
      }
    }, {
      name: "debug",
      type: {
        kind: "boolean"
      }
    }, {
      name: "action",
      type: {
        kind: "nullable",
        type: {
          kind: "string"
        }
      }
    }, {
      name: "parameters",
      type: {
        kind: "nullable",
        type: {
          kind: "map",
          keyType: {
            kind: "string"
          },
          valueType: {
            kind: "string"
          }
        }
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.launchMainActivity = function (arg0, arg1, arg2) {
    return _client.callRemoteFunction("AdbService/launchMainActivity", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "packageName",
      type: {
        kind: "string"
      }
    }, {
      name: "debug",
      type: {
        kind: "boolean"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.launchService = function (arg0, arg1, arg2, arg3) {
    return _client.callRemoteFunction("AdbService/launchService", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "packageName",
      type: {
        kind: "string"
      }
    }, {
      name: "serviceName",
      type: {
        kind: "string"
      }
    }, {
      name: "debug",
      type: {
        kind: "boolean"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.activityExists = function (arg0, arg1, arg2) {
    return _client.callRemoteFunction("AdbService/activityExists", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "packageName",
      type: {
        kind: "string"
      }
    }, {
      name: "activity",
      type: {
        kind: "string"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "boolean"
      });
    });
  };

  remoteModule.getAllAvailablePackages = function (arg0) {
    return _client.callRemoteFunction("AdbService/getAllAvailablePackages", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "array",
        type: {
          kind: "string"
        }
      });
    });
  };

  remoteModule.getJavaProcesses = function (arg0) {
    return _client.callRemoteFunction("AdbService/getJavaProcesses", "observable", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }])).map(value => {
      return _client.unmarshal(value, {
        kind: "array",
        type: {
          kind: "named",
          name: "AndroidJavaProcess"
        }
      });
    }).publish();
  };

  remoteModule.dumpsysPackage = function (arg0, arg1) {
    return _client.callRemoteFunction("AdbService/dumpsysPackage", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "identifier",
      type: {
        kind: "string"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "nullable",
        type: {
          kind: "string"
        }
      });
    });
  };

  remoteModule.touchFile = function (arg0, arg1) {
    return _client.callRemoteFunction("AdbService/touchFile", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "path",
      type: {
        kind: "string"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.removeFile = function (arg0, arg1) {
    return _client.callRemoteFunction("AdbService/removeFile", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }, {
      name: "path",
      type: {
        kind: "string"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.getAPIVersion = function (arg0) {
    return _client.callRemoteFunction("AdbService/getAPIVersion", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.getDeviceArchitecture = function (arg0) {
    return _client.callRemoteFunction("AdbService/getDeviceArchitecture", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.getInstalledPackages = function (arg0) {
    return _client.callRemoteFunction("AdbService/getInstalledPackages", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "serial",
      type: {
        kind: "string"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "array",
        type: {
          kind: "string"
        }
      });
    });
  };

  remoteModule.killServer = function () {
    return _client.callRemoteFunction("AdbService/killServer", "promise", _client.marshalArguments(Array.from(arguments), [])).then(value => {
      return _client.unmarshal(value, {
        kind: "void"
      });
    });
  };

  remoteModule.getApkManifest = function (arg0, arg1) {
    return _client.callRemoteFunction("AdbService/getApkManifest", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "apkPath",
      type: {
        kind: "string"
      }
    }, {
      name: "buildToolsVersion",
      type: {
        kind: "nullable",
        type: {
          kind: "string"
        }
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.getVersion = function () {
    return _client.callRemoteFunction("AdbService/getVersion", "promise", _client.marshalArguments(Array.from(arguments), [])).then(value => {
      return _client.unmarshal(value, {
        kind: "string"
      });
    });
  };

  remoteModule.checkMuxStatus = function () {
    return _client.callRemoteFunction("AdbService/checkMuxStatus", "promise", _client.marshalArguments(Array.from(arguments), [])).then(value => {
      return _client.unmarshal(value, {
        kind: "boolean"
      });
    });
  };

  remoteModule.checkInMuxPort = function (arg0) {
    return _client.callRemoteFunction("AdbService/checkInMuxPort", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "port",
      type: {
        kind: "number"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "void"
      });
    });
  };

  remoteModule.checkOutMuxPort = function (arg0) {
    return _client.callRemoteFunction("AdbService/checkOutMuxPort", "promise", _client.marshalArguments(Array.from(arguments), [{
      name: "port",
      type: {
        kind: "number"
      }
    }])).then(value => {
      return _client.unmarshal(value, {
        kind: "void"
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
    getDeviceInfo: {
      kind: "function",
      name: "getDeviceInfo",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 27
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 27
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }],
        returnType: {
          kind: "observable",
          type: {
            kind: "map",
            keyType: {
              kind: "string"
            },
            valueType: {
              kind: "string"
            }
          }
        }
      }
    },
    Process: {
      kind: "alias",
      location: {
        type: "source",
        fileName: "types.js",
        line: 35
      },
      name: "Process",
      definition: {
        kind: "object",
        fields: [{
          name: "user",
          type: {
            kind: "string"
          },
          optional: false
        }, {
          name: "pid",
          type: {
            kind: "number"
          },
          optional: false
        }, {
          name: "name",
          type: {
            kind: "string"
          },
          optional: false
        }, {
          name: "cpuUsage",
          type: {
            kind: "nullable",
            type: {
              kind: "number"
            }
          },
          optional: false
        }, {
          name: "memUsage",
          type: {
            kind: "nullable",
            type: {
              kind: "number"
            }
          },
          optional: false
        }, {
          name: "isJava",
          type: {
            kind: "boolean"
          },
          optional: false
        }]
      }
    },
    getProcesses: {
      kind: "function",
      name: "getProcesses",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 33
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 33
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "timeout",
          type: {
            kind: "number"
          }
        }],
        returnType: {
          kind: "observable",
          type: {
            kind: "array",
            type: {
              kind: "named",
              name: "Process"
            }
          }
        }
      }
    },
    stopProcess: {
      kind: "function",
      name: "stopProcess",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 40
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 40
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "packageName",
          type: {
            kind: "string"
          }
        }, {
          name: "pid",
          type: {
            kind: "number"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "void"
          }
        }
      }
    },
    AdbDevice: {
      kind: "alias",
      location: {
        type: "source",
        fileName: "types.js",
        line: 25
      },
      name: "AdbDevice",
      definition: {
        kind: "object",
        fields: [{
          name: "serial",
          type: {
            kind: "string"
          },
          optional: false
        }, {
          name: "displayName",
          type: {
            kind: "string"
          },
          optional: false
        }, {
          name: "usb",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          },
          optional: false
        }, {
          name: "product",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          },
          optional: false
        }, {
          name: "model",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          },
          optional: false
        }, {
          name: "device",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          },
          optional: false
        }, {
          name: "transportId",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          },
          optional: false
        }]
      }
    },
    getDeviceList: {
      kind: "function",
      name: "getDeviceList",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 48
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 48
        },
        kind: "function",
        argumentTypes: [],
        returnType: {
          kind: "promise",
          type: {
            kind: "array",
            type: {
              kind: "named",
              name: "AdbDevice"
            }
          }
        }
      }
    },
    getPidFromPackageName: {
      kind: "function",
      name: "getPidFromPackageName",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 52
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 52
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "packageName",
          type: {
            kind: "string"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "number"
          }
        }
      }
    },
    ProcessExitMessage: {
      kind: "alias",
      location: {
        type: "source",
        fileName: "process.js",
        line: 691
      },
      name: "ProcessExitMessage",
      definition: {
        kind: "object",
        fields: [{
          name: "kind",
          type: {
            kind: "string-literal",
            value: "exit"
          },
          optional: false
        }, {
          name: "exitCode",
          type: {
            kind: "nullable",
            type: {
              kind: "number"
            }
          },
          optional: false
        }, {
          name: "signal",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          },
          optional: false
        }]
      }
    },
    ProcessMessage: {
      kind: "alias",
      location: {
        type: "source",
        fileName: "process.js",
        line: 697
      },
      name: "ProcessMessage",
      definition: {
        kind: "union",
        types: [{
          kind: "object",
          fields: [{
            name: "kind",
            type: {
              kind: "string-literal",
              value: "stdout"
            },
            optional: false
          }, {
            name: "data",
            type: {
              kind: "string"
            },
            optional: false
          }]
        }, {
          kind: "object",
          fields: [{
            name: "kind",
            type: {
              kind: "string-literal",
              value: "stderr"
            },
            optional: false
          }, {
            name: "data",
            type: {
              kind: "string"
            },
            optional: false
          }]
        }, {
          kind: "object",
          fields: [{
            name: "kind",
            type: {
              kind: "string-literal",
              value: "exit"
            },
            optional: false
          }, {
            name: "exitCode",
            type: {
              kind: "nullable",
              type: {
                kind: "number"
              }
            },
            optional: false
          }, {
            name: "signal",
            type: {
              kind: "nullable",
              type: {
                kind: "string"
              }
            },
            optional: false
          }]
        }],
        discriminantField: "kind"
      }
    },
    installPackage: {
      kind: "function",
      name: "installPackage",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 59
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 59
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "packagePath",
          type: {
            kind: "named",
            name: "NuclideUri"
          }
        }],
        returnType: {
          kind: "observable",
          type: {
            kind: "named",
            name: "ProcessMessage"
          }
        }
      }
    },
    LegacyProcessMessage: {
      kind: "alias",
      location: {
        type: "source",
        fileName: "process.js",
        line: 710
      },
      name: "LegacyProcessMessage",
      definition: {
        kind: "union",
        types: [{
          kind: "object",
          fields: [{
            name: "kind",
            type: {
              kind: "string-literal",
              value: "stdout"
            },
            optional: false
          }, {
            name: "data",
            type: {
              kind: "string"
            },
            optional: false
          }]
        }, {
          kind: "object",
          fields: [{
            name: "kind",
            type: {
              kind: "string-literal",
              value: "stderr"
            },
            optional: false
          }, {
            name: "data",
            type: {
              kind: "string"
            },
            optional: false
          }]
        }, {
          kind: "object",
          fields: [{
            name: "kind",
            type: {
              kind: "string-literal",
              value: "exit"
            },
            optional: false
          }, {
            name: "exitCode",
            type: {
              kind: "nullable",
              type: {
                kind: "number"
              }
            },
            optional: false
          }, {
            name: "signal",
            type: {
              kind: "nullable",
              type: {
                kind: "string"
              }
            },
            optional: false
          }]
        }, {
          kind: "object",
          fields: [{
            name: "kind",
            type: {
              kind: "string-literal",
              value: "error"
            },
            optional: false
          }, {
            name: "error",
            type: {
              kind: "named",
              name: "Object"
            },
            optional: false
          }]
        }],
        discriminantField: "kind"
      }
    },
    uninstallPackage: {
      kind: "function",
      name: "uninstallPackage",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 66
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 66
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "packageName",
          type: {
            kind: "string"
          }
        }],
        returnType: {
          kind: "observable",
          type: {
            kind: "named",
            name: "LegacyProcessMessage"
          }
        }
      }
    },
    forwardJdwpPortToPid: {
      kind: "function",
      name: "forwardJdwpPortToPid",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 74
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 74
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "tcpPort",
          type: {
            kind: "number"
          }
        }, {
          name: "pid",
          type: {
            kind: "number"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          }
        }
      }
    },
    removeJdwpForwardSpec: {
      kind: "function",
      name: "removeJdwpForwardSpec",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 82
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 82
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "spec",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "string"
          }
        }
      }
    },
    launchActivity: {
      kind: "function",
      name: "launchActivity",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 89
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 89
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "packageName",
          type: {
            kind: "string"
          }
        }, {
          name: "activity",
          type: {
            kind: "string"
          }
        }, {
          name: "debug",
          type: {
            kind: "boolean"
          }
        }, {
          name: "action",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          }
        }, {
          name: "parameters",
          type: {
            kind: "nullable",
            type: {
              kind: "map",
              keyType: {
                kind: "string"
              },
              valueType: {
                kind: "string"
              }
            }
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "string"
          }
        }
      }
    },
    launchMainActivity: {
      kind: "function",
      name: "launchMainActivity",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 106
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 106
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "packageName",
          type: {
            kind: "string"
          }
        }, {
          name: "debug",
          type: {
            kind: "boolean"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "string"
          }
        }
      }
    },
    launchService: {
      kind: "function",
      name: "launchService",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 114
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 114
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "packageName",
          type: {
            kind: "string"
          }
        }, {
          name: "serviceName",
          type: {
            kind: "string"
          }
        }, {
          name: "debug",
          type: {
            kind: "boolean"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "string"
          }
        }
      }
    },
    activityExists: {
      kind: "function",
      name: "activityExists",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 123
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 123
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "packageName",
          type: {
            kind: "string"
          }
        }, {
          name: "activity",
          type: {
            kind: "string"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "boolean"
          }
        }
      }
    },
    getAllAvailablePackages: {
      kind: "function",
      name: "getAllAvailablePackages",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 131
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 131
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }],
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
    SimpleProcess: {
      kind: "alias",
      location: {
        type: "source",
        fileName: "types.js",
        line: 17
      },
      name: "SimpleProcess",
      definition: {
        kind: "object",
        fields: [{
          name: "user",
          type: {
            kind: "string"
          },
          optional: false
        }, {
          name: "pid",
          type: {
            kind: "string"
          },
          optional: false
        }, {
          name: "name",
          type: {
            kind: "string"
          },
          optional: false
        }]
      }
    },
    AndroidJavaProcess: {
      kind: "alias",
      location: {
        type: "source",
        fileName: "types.js",
        line: 23
      },
      name: "AndroidJavaProcess",
      definition: {
        kind: "named",
        name: "SimpleProcess"
      }
    },
    getJavaProcesses: {
      kind: "function",
      name: "getJavaProcesses",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 137
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 137
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }],
        returnType: {
          kind: "observable",
          type: {
            kind: "array",
            type: {
              kind: "named",
              name: "AndroidJavaProcess"
            }
          }
        }
      }
    },
    dumpsysPackage: {
      kind: "function",
      name: "dumpsysPackage",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 143
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 143
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "identifier",
          type: {
            kind: "string"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          }
        }
      }
    },
    touchFile: {
      kind: "function",
      name: "touchFile",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 150
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 150
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "path",
          type: {
            kind: "string"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "string"
          }
        }
      }
    },
    removeFile: {
      kind: "function",
      name: "removeFile",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 154
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 154
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }, {
          name: "path",
          type: {
            kind: "string"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "string"
          }
        }
      }
    },
    getAPIVersion: {
      kind: "function",
      name: "getAPIVersion",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 161
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 161
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "string"
          }
        }
      }
    },
    getDeviceArchitecture: {
      kind: "function",
      name: "getDeviceArchitecture",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 165
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 165
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "string"
          }
        }
      }
    },
    getInstalledPackages: {
      kind: "function",
      name: "getInstalledPackages",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 169
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 169
        },
        kind: "function",
        argumentTypes: [{
          name: "serial",
          type: {
            kind: "string"
          }
        }],
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
    killServer: {
      kind: "function",
      name: "killServer",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 175
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 175
        },
        kind: "function",
        argumentTypes: [],
        returnType: {
          kind: "promise",
          type: {
            kind: "void"
          }
        }
      }
    },
    getApkManifest: {
      kind: "function",
      name: "getApkManifest",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 200
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 200
        },
        kind: "function",
        argumentTypes: [{
          name: "apkPath",
          type: {
            kind: "string"
          }
        }, {
          name: "buildToolsVersion",
          type: {
            kind: "nullable",
            type: {
              kind: "string"
            }
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "string"
          }
        }
      }
    },
    getVersion: {
      kind: "function",
      name: "getVersion",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 208
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 208
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
    checkMuxStatus: {
      kind: "function",
      name: "checkMuxStatus",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 212
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 212
        },
        kind: "function",
        argumentTypes: [],
        returnType: {
          kind: "promise",
          type: {
            kind: "boolean"
          }
        }
      }
    },
    checkInMuxPort: {
      kind: "function",
      name: "checkInMuxPort",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 223
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 223
        },
        kind: "function",
        argumentTypes: [{
          name: "port",
          type: {
            kind: "number"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "void"
          }
        }
      }
    },
    checkOutMuxPort: {
      kind: "function",
      name: "checkOutMuxPort",
      location: {
        type: "source",
        fileName: "AdbService.js",
        line: 229
      },
      type: {
        location: {
          type: "source",
          fileName: "AdbService.js",
          line: 229
        },
        kind: "function",
        argumentTypes: [{
          name: "port",
          type: {
            kind: "number"
          }
        }],
        returnType: {
          kind: "promise",
          type: {
            kind: "void"
          }
        }
      }
    }
  }
});