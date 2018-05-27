/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

package com.facebook.nuclide.debugger;

import com.github.javaparser.*;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.PackageDeclaration;
import com.github.javaparser.ast.body.TypeDeclaration;
import com.sun.jdi.AbsentInformationException;
import com.sun.jdi.Location;
import com.sun.jdi.ReferenceType;
import com.sun.jdi.request.ClassPrepareRequest;
import com.sun.jdi.request.EventRequest;
import com.sun.jdi.request.EventRequestManager;
import java.util.Optional;
import java.io.FileInputStream;
import java.io.IOException;
import org.json.JSONObject;

/** Source line breakpoint spec. Threading: access from both request and event threads. */
public class FileLineBreakpointSpec extends BreakpointSpec {
  private final FileLineBreakpointRequestInfo _requestInfo;
  private volatile Optional<ClassPrepareRequest> _classPrepareRequest = Optional.empty();
  private String _className;

  public FileLineBreakpointSpec(
      ContextManager contextManager, FileLineBreakpointRequestInfo locationInfo, String condition) {
    super(contextManager, condition);

    String filePath = locationInfo.getFilePath();
    _requestInfo = locationInfo;
    _className = getClassNameForBreakpoint(filePath);
  }

  private String getClassNameForBreakpoint(String filePath) {
    int targetLine = _requestInfo.getLine();

    // Find the type declaration that contains the breakpoint line.
    try (FileInputStream stream = new FileInputStream(filePath)) {
      CompilationUnit unit = JavaParser.parse(stream);
      for (TypeDeclaration decl : unit.getTypes()) {
        Optional<Range> r = decl.getRange();
        if (!r.isPresent()) {
          continue;
        }

        String packagePrefix =
            unit.getPackageDeclaration().isPresent()
                ? (unit.getPackageDeclaration().get().getName().toString() + ".")
                : "";
        Position begin = r.get().begin;
        Position end = r.get().end;
        if (begin.line <= targetLine && end.line >= targetLine) {
          return packagePrefix + decl.getName().toString();
        }
      }
    } catch (IOException e) {
      // TODO log
    }

    return "";
  }

  @Override
  public void enable() {
    resolveImmediate(_className);
    if (!isResolved()) {
      watchForClassPrepare();
    }
  }

  @Override
  protected void handleBreakpointResolved() {
    // No need to watch future class prepare after breakpoint resolved.
    if (_classPrepareRequest.isPresent()) {
      _classPrepareRequest.get().disable();
      getContextManager()
          .getVirtualMachine()
          .eventRequestManager()
          .deleteEventRequest(_classPrepareRequest.get());
      _classPrepareRequest = Optional.empty();
    }

    // Now that this is resolved, we should have a bound location. Tell the
    // breakpoint manager.
    Optional<Location> location = getBoundLocation();
    if (location.isPresent()) {
      getContextManager().getBreakpointManager().addResolvedBreakpoint(this, location.get());
    }
  }

  /** Watch for future class prepare/load if not resolved yet. */
  private void watchForClassPrepare() {
    EventRequestManager em = getContextManager().getVirtualMachine().eventRequestManager();
    _classPrepareRequest = Optional.of(em.createClassPrepareRequest());
    _classPrepareRequest.get().addClassFilter(_className);
    _classPrepareRequest.get().setSuspendPolicy(EventRequest.SUSPEND_ALL);
    _classPrepareRequest.get().enable();
  }

  @Override
  protected boolean doesClassMatchBreakpoint(String className) {
    return className.equals(_className);
  }

  @Override
  public JSONObject getLocationJson() {
    SourceFileSpec sourceFile =
        getContextManager()
            .getFileManager()
            .register(_requestInfo.getFilePath(), _requestInfo.getFilePath());
    return Utils.getLocationJson(sourceFile.getScriptId(), _requestInfo.getLine());
  }

  @Override
  public int getLine() {
    return _requestInfo.getLine();
  }

  @Override
  protected Optional<Location> getMatchLocationFromClass(ReferenceType refType) {
    try {
      // TODO: handle multiple locations.
      return refType.locationsOfLine(_requestInfo.getLine()).stream().findFirst();
    } catch (AbsentInformationException e) {
      // This type does not have line info, ignore it.
      return Optional.empty();
    }
  }
}
