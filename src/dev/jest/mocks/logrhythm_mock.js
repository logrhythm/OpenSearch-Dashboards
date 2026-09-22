/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Mock for @logrhythm/* packages which use ESM and cannot be transformed by Jest.
 * Returns a no-op React component for any default/named export.
 */

const NoOp = () => null;

module.exports = new Proxy(
  { default: NoOp, __esModule: true },
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      // Return a no-op component for any named export
      return NoOp;
    },
  }
);
