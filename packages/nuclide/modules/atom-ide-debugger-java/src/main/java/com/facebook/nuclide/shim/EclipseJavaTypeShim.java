/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

package com.facebook.nuclide.shim;

import com.sun.jdi.Value;

public class EclipseJavaTypeShim extends AbstractEclipseJavaTypeShim {
  private final Value _value;

  public EclipseJavaTypeShim(Value value) {
    _value = value;
  }
}
