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

    // Keys used to persist the pending redirect across page reloads.
    // configureOSD.py (ExecStartPost) may take several minutes to import saved objects on an
    // elasticsearch→opensearch upgrade; sessionStorage keeps the intent alive if the user
    // reloads the page while the poller is still waiting.
    const POLLER_EXPIRY_KEY = 'nm_analyze_poller_expiry';
    const POLLER_TARGET_KEY = 'nm_analyze_poller_target';
    const POLLER_BASE_KEY = 'nm_analyze_poller_base';
    const POLLER_INTERVAL_MS = 5000;
    const POLLER_DURATION_MS = 360000; // 6 min — enough for configureOSD.py on a slow upgrade

    // Guard against launching a second concurrent poller on hashchange (e.g. OSD redirects
    // #/view/{id} → #/list before configureOSD.py finishes). Resets on success or expiry.
    let pollerActive = false;

    const startAnalyzeRedirectPoller = (targetUrl: string, analyzeBase: string) => {
      if (pollerActive) return; // a poller is already running; let it finish
      pollerActive = true;

      // Persist intent so a page reload can resume the poller.
      const expiresAt = Date.now() + POLLER_DURATION_MS;
      try {
        sessionStorage.setItem(POLLER_EXPIRY_KEY, String(expiresAt));
        sessionStorage.setItem(POLLER_TARGET_KEY, targetUrl);
        sessionStorage.setItem(POLLER_BASE_KEY, analyzeBase);
      } catch (_) {
        /* sessionStorage may be unavailable in some envs; continue without persistence */
      }

      const apiUrl = `${analyzeBase}/api/saved_objects/dashboard/${defaultAnalyzeDashboardId}`;

      const tryOnce = () => {
        let expiry = POLLER_DURATION_MS + Date.now(); // fallback if sessionStorage unavailable
        try {
          expiry = parseInt(sessionStorage.getItem(POLLER_EXPIRY_KEY) || '0', 10) || expiry;
        } catch (_) {}
        if (Date.now() > expiry) {
          pollerActive = false;
          return; // give up — OSD probably won't load the dashboard
        }

        fetch(apiUrl, { credentials: 'same-origin' })
          .then((resp) => {
            if (resp.ok) {
              pollerActive = false;
              // Do NOT clear sessionStorage here. If OSD can't render the dashboard
              // (e.g. referenced visualizations still loading) it falls back to #/list;
              // keeping the sessionStorage entry lets the resume logic restart the poller.
              // The entry expires naturally after POLLER_DURATION_MS.
              // Use startsWith so OSD state params appended to the hash (e.g. ?_a=...&_g=...)
              // don't cause a spurious redirect when we're already viewing the dashboard.
              const currentPathHash = window.location.pathname + window.location.hash;
              if (!currentPathHash.startsWith(targetUrl)) {
                window.location.replace(targetUrl);
              }
              return;
            }
            // Any non-200 (404 = not loaded yet, 503 = OSD migration in progress, etc.) — retry.
            setTimeout(tryOnce, POLLER_INTERVAL_MS);
          })
          .catch(() => setTimeout(tryOnce, POLLER_INTERVAL_MS)); // network error — keep waiting
      };

      tryOnce();
    };

    const redirectLegacyAnalyzeLanding = () => {
      const pathName = window.location.pathname;
      const hash = window.location.hash || '';

      const analyzeRootMatch = pathName.match(/^(.*\/analyze)\/?$/);
      const dashboardsRootMatch = pathName.match(/^(.*\/analyze\/app\/dashboards)\/?$/);
      const legacyKibanaAnalyzeMatch = pathName.match(/^(.*\/analyze)\/app\/kibana\/?$/);

      const isBlankHash = hash === '' || hash === '#' || hash === '#/';
      const isLegacyDashboardRoot = /^#\/dashboard\/?(?:\?|$)/.test(hash);
      // Matches #/view/{defaultId} with any trailing query params — covers the case where the
      // browser restores the last visited URL after an elasticsearch→opensearch upgrade, but
      // configureOSD.py hasn't imported the dashboard yet so OSD falls back to #/list.
      const isDefaultDashView = new RegExp(`^#\\/view\\/${defaultAnalyzeDashboardId}`).test(hash);

      // Resume a persisted poller after a page reload (e.g. user refreshed while waiting).
      const isOnAnalyzeApp = !!(analyzeRootMatch || dashboardsRootMatch);
      if (isOnAnalyzeApp) {
        try {
          const storedTarget = sessionStorage.getItem(POLLER_TARGET_KEY);
          const storedBase = sessionStorage.getItem(POLLER_BASE_KEY);
          const storedExpiry = parseInt(sessionStorage.getItem(POLLER_EXPIRY_KEY) || '0', 10);
          const currentPathHash = window.location.pathname + window.location.hash;
          if (
            storedTarget &&
            storedBase &&
            storedExpiry > Date.now() &&
            !currentPathHash.startsWith(storedTarget)
          ) {
            startAnalyzeRedirectPoller(storedTarget, storedBase);
            return true;
          }
        } catch (_) {}
      }

      if ((analyzeRootMatch || dashboardsRootMatch) && isBlankHash) {
        const targetBase = analyzeRootMatch ? analyzeRootMatch[1] : dashboardsRootMatch![1];
        const analyzeBase = analyzeRootMatch
          ? analyzeRootMatch[1]
          : targetBase.replace(/\/app\/dashboards$/, '');
        const targetUrl = analyzeRootMatch
          ? `${targetBase}/app/dashboards#/view/${defaultAnalyzeDashboardId}`
          : `${targetBase}#/view/${defaultAnalyzeDashboardId}`;

        startAnalyzeRedirectPoller(targetUrl, analyzeBase);
        return true;
      }

      // Handle direct navigation to #/view/{defaultId} (e.g. browser restoring the last URL
      // after an upgrade). OSD will redirect to #/list if the dashboard doesn't exist yet;
      // the poller detects this via sessionStorage and resumes on the subsequent hashchange.
      if (dashboardsRootMatch && isDefaultDashView) {
        const targetBase = dashboardsRootMatch[1];
        const analyzeBase = targetBase.replace(/\/app\/dashboards$/, '');
        const targetUrl = `${targetBase}#/view/${defaultAnalyzeDashboardId}`;
        startAnalyzeRedirectPoller(targetUrl, analyzeBase);
        return true;
      }

      if (legacyKibanaAnalyzeMatch && isLegacyDashboardRoot) {
        const targetBase = legacyKibanaAnalyzeMatch[1];
        const targetUrl = `${targetBase}/app/dashboards#/view/${defaultAnalyzeDashboardId}`;
        startAnalyzeRedirectPoller(targetUrl, targetBase);
        return true;
      }

      return false;
    };

    // Always set up the hashchange listener before the initial check so any subsequent
    // hash navigation is also evaluated (e.g. a direct link to /app/kibana).
    // Do NOT return early after scheduling a redirect — full plugin setup must complete
    // so the netmon globals and header style are available when the dashboard loads.
    redirectLegacyAnalyzeLanding();
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
