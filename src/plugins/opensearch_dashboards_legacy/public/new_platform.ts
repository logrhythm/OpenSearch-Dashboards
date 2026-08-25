/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import { CoreStart } from 'opensearch-dashboards/public';

export let npStart: CoreStart;

export const setNpStart = (coreStart: CoreStart) => {
  if (!coreStart) {
    return;
  }
  npStart = coreStart;
};

export const getNpStart = (): CoreStart | undefined => {
  return npStart;
};
