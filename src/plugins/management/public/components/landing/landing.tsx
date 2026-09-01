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

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { FormattedMessage } from '@osd/i18n/react';

import { EuiHorizontalRule, EuiIcon, EuiPageContent, EuiSpacer, EuiText } from '@elastic/eui';
import { useMount } from 'react-use';

interface ManagementLandingPageProps {
  version: string;
  setBreadcrumbs: () => void;
}

export const ManagementLandingPage = ({ setBreadcrumbs }: ManagementLandingPageProps) => {
  useMount(() => {
    setBreadcrumbs();
  });

  return (
    <EuiPageContent
      data-test-subj="managementHome"
      style={{ maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}
    >
      <div>
        <div className="eui-textCenter">
          <EuiIcon type="managementApp" size="xxl" />
          <EuiSpacer />
          <EuiText size="s">
            <h1>
              <FormattedMessage
                id="management.landing.header"
                defaultMessage="NetMon-UI management"
              />
            </h1>
          </EuiText>
          <EuiText size="s">
            <FormattedMessage
              id="management.landing.subhead"
              defaultMessage="Manage your indices, index patterns, saved objects, NetMon-UI settings, and more."
            />
          </EuiText>
        </div>

        <EuiHorizontalRule />

        <EuiText color="subdued" size="s" textAlign="center">
          <p>
            <FormattedMessage
              id="management.landing.text"
              defaultMessage="A full list of tools can be found in the left menu"
            />
          </p>
        </EuiText>
      </div>
    </EuiPageContent>
  );
};
