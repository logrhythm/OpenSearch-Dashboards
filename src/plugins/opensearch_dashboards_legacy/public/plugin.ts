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

import { PluginInitializerContext, CoreStart, CoreSetup } from 'opensearch-dashboards/public';
import { ConfigSchema } from '../config';
import { getDashboardConfig } from './dashboard_config';
import { injectHeaderStyle } from './utils/inject_header_style';
import { setNpStart } from './new_platform';
import 'lr-style/dist/lr-style.css';

export class OpenSearchDashboardsLegacyPlugin {
  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(core: CoreSetup<{}, OpenSearchDashboardsLegacyStart>) {
    return {};
  }

  public start(core: CoreStart) {
    const { application, chrome, uiSettings } = core;

    // Redirect bare Analyze URLs to a default dashboard to avoid blank landing pages.
    const defaultAnalyzeDashboardId = 'b595b4a0-d0c6-11e9-a8eb-5fa4111061ad';
    const redirectLegacyAnalyzeLanding = () => {
      const pathName = window.location.pathname;
      const hash = window.location.hash || '';

      const analyzeRootMatch = pathName.match(/^(.*\/analyze)\/?$/);
      const dashboardsRootMatch = pathName.match(/^(.*\/analyze\/app\/dashboards)\/?$/);
      const legacyKibanaAnalyzeMatch = pathName.match(/^(.*\/analyze)\/app\/kibana\/?$/);

      const isBlankHash = hash === '' || hash === '#' || hash === '#/' || hash === '#/list';
      const isLegacyDashboardRoot = /^#\/dashboard\/?(?:\?|$)/.test(hash);

      if ((analyzeRootMatch || dashboardsRootMatch) && isBlankHash) {
        const targetBase = analyzeRootMatch ? analyzeRootMatch[1] : dashboardsRootMatch![1];
        const targetUrl = analyzeRootMatch
          ? `${targetBase}/app/dashboards#/view/${defaultAnalyzeDashboardId}`
          : `${targetBase}#/view/${defaultAnalyzeDashboardId}`;

        if (window.location.href !== targetUrl) {
          window.location.replace(targetUrl);
          return true;
        }
      }

      if (legacyKibanaAnalyzeMatch && isLegacyDashboardRoot) {
        const targetBase = legacyKibanaAnalyzeMatch[1];
        const targetUrl = `${targetBase}/app/dashboards#/view/${defaultAnalyzeDashboardId}`;
        if (window.location.href !== targetUrl) {
          window.location.replace(targetUrl);
          return true;
        }
      }

      return false;
    };

    if (redirectLegacyAnalyzeLanding()) {
      return;
    }

    window.addEventListener('hashchange', redirectLegacyAnalyzeLanding);

    setNpStart(core);

    // Expose NetMon dashboards on window globals so the LogRhythm navbar can
    // populate the Analyze dropdown menu regardless of which API it queries.
    const setupNetMonDashboards = () => {
      const dashboards = [
        {
          id: 'Alarm-Trend-Dashboard',
          title: 'Alarm Trend Dashboard',
          url: '/analyze/app/dashboards#/view/Alarm-Trend-Dashboard',
        },
        {
          id: 'Alarms-Dashboard',
          title: 'Alarms Dashboard',
          url: '/analyze/app/dashboards#/view/Alarms-Dashboard',
        },
        {
          id: 'Application-Exploration-Dashboard',
          title: 'Application Exploration Dashboard',
          url: '/analyze/app/dashboards#/view/Application-Exploration-Dashboard',
        },
        {
          id: 'Capture-Dashboard',
          title: 'Capture Dashboard',
          url: '/analyze/app/dashboards#/view/Capture-Dashboard',
        },
        {
          id: 'Destination-Port-Dashboard',
          title: 'Destination Port Dashboard',
          url: '/analyze/app/dashboards#/view/Destination-Port-Dashboard',
        },
        {
          id: 'File-Reconstruction-Dashboard',
          title: 'File Reconstruction Dashboard',
          url: '/analyze/app/dashboards#/view/File-Reconstruction-Dashboard',
        },
        {
          id: 'Ingress-Egress-Traffic-Dashboard',
          title: 'Ingress/Egress Traffic Dashboard',
          url: '/analyze/app/dashboards#/view/Ingress-Egress-Traffic-Dashboard',
        },
        {
          id: 'Network-Analysis-Dashboard',
          title: 'Network Analysis Dashboard',
          url: '/analyze/app/dashboards#/view/Network-Analysis-Dashboard',
        },
        {
          id: 'Replayed-Traffic-Dashboard',
          title: 'Replayed Traffic Dashboard',
          url: '/analyze/app/dashboards#/view/Replayed-Traffic-Dashboard',
        },
        {
          id: 'SMB-Dashboard',
          title: 'SMB Dashboard',
          url: '/analyze/app/dashboards#/view/SMB-Dashboard',
        },
        {
          id: 'SMTP-Trends-Dashboard',
          title: 'SMTP Trends Dashboard',
          url: '/analyze/app/dashboards#/view/SMTP-Trends-Dashboard',
        },
        {
          id: 'Top-Level-Domain-Dashboard',
          title: 'Top Level Domain Dashboard',
          url: '/analyze/app/dashboards#/view/Top-Level-Domain-Dashboard',
        },
        {
          id: 'Traffic-Endpoints-Dashboard',
          title: 'Traffic Endpoints Dashboard',
          url: '/analyze/app/dashboards#/view/Traffic-Endpoints-Dashboard',
        },
        {
          id: 'Traffic-Profile-Dashboard',
          title: 'Traffic Profile Dashboard',
          url: '/analyze/app/dashboards#/view/Traffic-Profile-Dashboard',
        },
        {
          id: 'b595b4a0-d0c6-11e9-a8eb-5fa4111061ad',
          title: 'Analyze Dashboard',
          url: '/analyze/app/dashboards#/view/b595b4a0-d0c6-11e9-a8eb-5fa4111061ad',
        },
        {
          id: 'd399cd30-42d9-11ea-9440-bd6688166a53',
          title: 'Network Node Link Dashboard',
          url: '/analyze/app/dashboards#/view/d399cd30-42d9-11ea-9440-bd6688166a53',
        },
      ];

      (window as any).netmonDashboards = dashboards;
      (window as any).NetMonDashboards = dashboards;
      (window as any).NETMON_DASHBOARDS = dashboards;

      (window as any).logrhythm = (window as any).logrhythm || {};
      (window as any).logrhythm.dashboards = dashboards;
      (window as any).logrhythm.netmon = (window as any).logrhythm.netmon || {};
      (window as any).logrhythm.netmon.dashboards = dashboards;

      (window as any).kibana = (window as any).kibana || {};
      (window as any).kibana.dashboards = dashboards;
      (window as any).kibana.netmon = dashboards;

      (window as any).nm = (window as any).nm || {};
      (window as any).nm.dashboards = dashboards;

      (window as any).getNetMonDashboards = () => dashboards;
      (window as any).getNmDashboards = () => dashboards;

      return dashboards;
    };

    setupNetMonDashboards();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupNetMonDashboards);
    } else {
      setTimeout(setupNetMonDashboards, 100);
    }

    // Ensure capabilities are available globally for legacy navbar consumers.
    if (!(window as any).kibanaCapabilities) {
      (window as any).kibanaCapabilities = {
        discover: { save: true, saveQuery: true, show: true, createShortUrl: true },
        dashboard: {
          createNew: true,
          save: true,
          saveQuery: true,
          show: true,
          showWriteControls: true,
        },
        visualize: { save: true, saveQuery: true, show: true, createShortUrl: true },
      };
    }

    // Add tab-* application classes for CSS context (7.5.2 navbar compatibility).
    application.currentAppId$.subscribe((appId) => {
      chrome.removeApplicationClass('tab-dashboard');
      chrome.removeApplicationClass('tab-visualize');
      chrome.removeApplicationClass('tab-discover');
      if (appId) {
        chrome.addApplicationClass(`tab-${appId}`);
      }
    });

    if (
      window.location.pathname.includes('dashboard') ||
      window.location.hash.includes('dashboard')
    ) {
      chrome.addApplicationClass('tab-dashboard');
    }

    setTimeout(() => {
      const appContainer = document.querySelector('.application');
      if (
        appContainer &&
        (window.location.hash.includes('dashboard') ||
          window.location.pathname.includes('dashboard'))
      ) {
        appContainer.classList.add('tab-dashboard');
      }
    }, 1000);

    injectHeaderStyle(uiSettings);

    return {
      dashboardConfig: getDashboardConfig(!application.capabilities?.dashboard?.showWriteControls),
      loadFontAwesome: async () => {
        await import('./font_awesome');
      },
      config: this.initializerContext.config.get(),
    };
  }
}

export type OpenSearchDashboardsLegacySetup = ReturnType<OpenSearchDashboardsLegacyPlugin['setup']>;
export type OpenSearchDashboardsLegacyStart = ReturnType<OpenSearchDashboardsLegacyPlugin['start']>;
