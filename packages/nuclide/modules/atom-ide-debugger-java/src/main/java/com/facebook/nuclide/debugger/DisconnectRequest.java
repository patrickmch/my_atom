/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

package com.facebook.nuclide.debugger;

import org.json.JSONException;
import org.json.JSONObject;

public class DisconnectRequest extends base$Request {
  public DisconnectArguments arguments;

  public DisconnectRequest(JSONObject request) throws JSONException {
    super(request);
    arguments = new DisconnectArguments(request.getJSONObject("arguments"));
  }
}
