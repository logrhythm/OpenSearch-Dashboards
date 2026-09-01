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
import 'lr-style/dist/lr-style.css';
import '@logrhythm/icons/icons.css';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderSectionItemButton,
  EuiHeaderSectionItemButtonProps,
  EuiIcon,
  EuiTitle,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import classnames from 'classnames';
import React, { createRef, useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeNavControl,
  ChromeNavLink,
  ChromeRecentlyAccessedHistoryItem,
  HeaderVariant,
} from '../..';
import type { Logos } from '../../../../common/types';
import { WorkspaceObject, WorkspacesStart } from '../../../../public/workspace';
import { InternalApplicationStart } from '../../../application/types';
import { HttpStart } from '../../../http';
import { useObservableValue } from '../../../utils';
import { getOsdSidecarPaddingStyle, ISidecarConfig } from '../../../overlays';
import {
  ChromeBranding,
  ChromeBreadcrumbEnricher,
  ChromeHelpExtension,
} from '../../chrome_service';
import { ChromeNavGroupServiceStartContract, NavGroupItemInMap } from '../../nav_group';
import { OnIsLockedUpdate } from './';
import { CollapsibleNav } from './collapsible_nav';
import { CollapsibleNavGroupEnabled } from './collapsible_nav_group_enabled';
import './header.scss';
import { HeaderActionMenu } from './header_action_menu';
import { HeaderBadge } from './header_badge';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderControlsContainer } from './header_controls_container';
import { HeaderNavControls } from './header_nav_controls';
import { RecentItems } from './recent_items';
import { GlobalSearchCommand } from '../../global_search';
import { LogRhythmNavbar } from '../../../../../netmon/components/navbar';
import {
  NmLeftNav,
  APPS_WITHOUT_TITLE,
  APPS_WITHOUT_ACTIONROW,
} from '../../../../../netmon/components/nm_left_nav';

export interface HeaderProps {
  http: HttpStart;
  opensearchDashboardsVersion: string;
  application: InternalApplicationStart;
  appTitle$: Observable<string>;
  badge$: Observable<ChromeBadge | undefined>;
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  breadcrumbsEnricher$: Observable<ChromeBreadcrumbEnricher | undefined>;
  collapsibleNavHeaderRender?: () => JSX.Element | null;
  customNavLink$: Observable<ChromeNavLink | undefined>;
  homeHref: string;
  isVisible$: Observable<boolean>;
  headerVariant$: Observable<HeaderVariant | undefined>;
  opensearchDashboardsDocLink: string;
  navLinks$: Observable<ChromeNavLink[]>;
  recentlyAccessed$: Observable<ChromeRecentlyAccessedHistoryItem[]>;
  forceAppSwitcherNavigation$: Observable<boolean>;
  helpExtension$: Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Observable<string>;
  navControlsLeft$: Observable<readonly ChromeNavControl[]>;
  navControlsCenter$: Observable<readonly ChromeNavControl[]>;
  navControlsRight$: Observable<readonly ChromeNavControl[]>;
  navControlsExpandedCenter$: Observable<readonly ChromeNavControl[]>;
  navControlsExpandedRight$: Observable<readonly ChromeNavControl[]>;
  navControlsLeftBottom$: Observable<readonly ChromeNavControl[]>;
  navControlsPrimaryHeaderRight$: Observable<readonly ChromeNavControl[]>;
  basePath: HttpStart['basePath'];
  isLocked$: Observable<boolean>;
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  onIsLockedUpdate: OnIsLockedUpdate;
  branding: ChromeBranding;
  logos: Logos;
  survey: string | undefined;
  sidecarConfig$: Observable<ISidecarConfig | undefined>;
  navGroupEnabled: boolean;
  currentNavGroup$: Observable<NavGroupItemInMap | undefined>;
  navGroupsMap$: Observable<Record<string, NavGroupItemInMap>>;
  setCurrentNavGroup: ChromeNavGroupServiceStartContract['setCurrentNavGroup'];
  workspaceList$: Observable<WorkspaceObject[]>;
  currentWorkspace$: WorkspacesStart['currentWorkspace$'];
  useUpdatedHeader?: boolean;
  globalSearchCommands?: GlobalSearchCommand[];
}

const hasValue = (value: any) => {
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }

  return Boolean(value);
};

export function Header({
  http,
  opensearchDashboardsVersion: _opensearchDashboardsVersion,
  opensearchDashboardsDocLink: _opensearchDashboardsDocLink,
  application,
  basePath,
  onIsLockedUpdate,
  homeHref,
  branding: _branding,
  survey: _survey,
  logos,
  collapsibleNavHeaderRender,
  navGroupEnabled,
  setCurrentNavGroup,
  useUpdatedHeader,
  globalSearchCommands,
  ...observables
}: HeaderProps) {
  const isVisible = useObservable(observables.isVisible$, false);
  const headerVariant = useObservable(observables.headerVariant$, HeaderVariant.PAGE);
  const isLocked = useObservable(observables.isLocked$, false);
  const [isNavOpenState, setIsNavOpenState] = useState(false);
  const sidecarConfig = useObservable(observables.sidecarConfig$, undefined);
  const breadcrumbs = useObservable(observables.breadcrumbs$, []);

  const currentLeftControls = useObservableValue(application.currentLeftControls$);
  const navControlsLeft = useObservable(observables.navControlsLeft$);

  const currentCenterControls = useObservableValue(application.currentCenterControls$);
  const navControlsExpandedCenter = useObservable(observables.navControlsExpandedCenter$);
  const navControlsCenter = useObservable(observables.navControlsCenter$);

  const currentRightControls = useObservableValue(application.currentRightControls$);
  const navControlsExpandedRight = useObservable(observables.navControlsExpandedRight$);
  const navControlsRight = useObservable(observables.navControlsRight$);

  const currentActionMenu = useObservableValue(application.currentActionMenu$);

  const currentBadgeControls = useObservableValue(application.currentBadgeControls$);
  const observableBadge = useObservable(observables.badge$);
  const currentAppId = useObservable(application.currentAppId$, '');

  const sidecarPaddingStyle = useMemo(() => {
    return getOsdSidecarPaddingStyle(sidecarConfig);
  }, [sidecarConfig]);

  const isNavOpen = useUpdatedHeader ? isLocked : isNavOpenState;

  // Keep the container white on the very first paint; the gradient shows once
  // the navbar component has had a chance to render from its cached auth state.
  const [navbarReady, setNavbarReady] = useState(false);
  useEffect(() => {
    setNavbarReady(true);
  }, []);

  const setIsNavOpen = useCallback(
    (value) => {
      /**
       * When use updated header, we will regard the lock state as source of truth
       */
      if (useUpdatedHeader) {
        onIsLockedUpdate(value);
      } else {
        setIsNavOpenState(value);
      }
    },
    [setIsNavOpenState, onIsLockedUpdate, useUpdatedHeader]
  );

  if (!isVisible) {
    return null;
  }

  const toggleCollapsibleNavRef = createRef<HTMLButtonElement & { euiAnimate: () => void }>();
  const navId = htmlIdGenerator()();
  const className = classnames('hide-for-sharing', 'headerGlobalNav');
  const useApplicationHeader = headerVariant === HeaderVariant.APPLICATION;

  const renderBreadcrumbs = (renderFullLength?: boolean, hideTrailingSeparator?: boolean) => (
    <HeaderBreadcrumbs
      appTitle$={observables.appTitle$}
      breadcrumbs$={observables.breadcrumbs$}
      breadcrumbsEnricher$={observables.breadcrumbsEnricher$}
      useUpdatedHeader={useUpdatedHeader}
      renderFullLength={renderFullLength}
      hideTrailingSeparator={hideTrailingSeparator}
    />
  );

  const renderNavToggle = () => {
    const renderNavToggleWithExtraProps = (
      props: EuiHeaderSectionItemButtonProps & { isSmallScreen?: boolean }
    ) => {
      const { isSmallScreen, ...others } = props;
      return (
        <EuiHeaderSectionItemButton
          data-test-subj="toggleNavButton"
          aria-label={i18n.translate('core.ui.primaryNav.toggleNavAriaLabel', {
            defaultMessage: 'Toggle primary navigation',
          })}
          onClick={() => setIsNavOpen(!isNavOpen)}
          aria-expanded={isNavOpen}
          aria-pressed={isNavOpen}
          aria-controls={navId}
          ref={toggleCollapsibleNavRef}
          {...others}
          className={classnames(
            useUpdatedHeader
              ? useApplicationHeader
                ? 'newAppTopNavExpander'
                : 'newPageTopNavExpander'
              : undefined,
            props.className
          )}
        >
          {props.isSmallScreen ? (
            /**
             * Using <EuiButtonIcon type="base" /> here will introduce a warning in console
             * because button can not be a child of a button. In order to give the looks of a bordered icon,
             * here we use the classes to imitate the style
             */
            <span className="euiButtonIcon euiButtonIcon--subdued euiButtonIcon--xSmall ">
              <EuiIcon
                title={i18n.translate('core.ui.primaryNav.menu', {
                  defaultMessage: 'Menu',
                })}
                type="menu"
                size="s"
              />
            </span>
          ) : (
            <EuiIcon
              type="menu"
              size="m"
              title={i18n.translate('core.ui.primaryNav.menu', {
                defaultMessage: 'Menu',
              })}
            />
          )}
        </EuiHeaderSectionItemButton>
      );
    };
    return useUpdatedHeader ? (
      <>
        {isNavOpen
          ? null
          : renderNavToggleWithExtraProps({
              className: 'navToggleInLargeScreen eui-hideFor--xs eui-hideFor--s eui-hideFor--m',
            })}
        {renderNavToggleWithExtraProps({
          flush: 'both',
          className:
            'navToggleInSmallScreen eui-hideFor--xl eui-hideFor--l eui-hideFor--xxl eui-hideFor--xxxl',
          isSmallScreen: true,
        })}
      </>
    ) : (
      renderNavToggleWithExtraProps({})
    );
  };

  const renderLeftControls = () => {
    const hasLeftControls = hasValue(currentLeftControls);
    const hasNavControlsLeft = hasValue(navControlsLeft);

    if (!hasLeftControls && !hasNavControlsLeft && useUpdatedHeader) {
      return null;
    }

    return (
      <>
        {useUpdatedHeader && (
          <EuiHeaderSectionItem border="none">
            <HeaderControlsContainer
              data-test-subj="headerLeftControl"
              controls$={application.currentLeftControls$}
            />
          </EuiHeaderSectionItem>
        )}

        {/* Nav controls left */}

        <EuiHeaderSectionItem border={useUpdatedHeader ? 'none' : 'right'}>
          <HeaderNavControls side="left" navControls$={observables.navControlsLeft$} />
        </EuiHeaderSectionItem>
      </>
    );
  };

  const renderCenterControls = () => {
    const hasCenterControls = hasValue(currentCenterControls);
    const hasNavControlsExpandedCenter = hasValue(navControlsExpandedCenter);
    const hasNavControlsCenter = hasValue(navControlsCenter);

    if (
      !hasCenterControls &&
      !hasNavControlsExpandedCenter &&
      !hasNavControlsCenter &&
      useUpdatedHeader
    ) {
      return null;
    }

    return (
      <>
        {useUpdatedHeader && (
          <EuiHeaderSectionItem border="none">
            <HeaderNavControls navControls$={observables.navControlsExpandedCenter$} />
          </EuiHeaderSectionItem>
        )}

        {useUpdatedHeader && (
          <EuiHeaderSectionItem border="none">
            <HeaderControlsContainer
              data-test-subj="headerCenterControl"
              controls$={application.currentCenterControls$}
            />
          </EuiHeaderSectionItem>
        )}

        <EuiHeaderSectionItem border={useUpdatedHeader ? 'none' : 'left'}>
          <HeaderNavControls navControls$={observables.navControlsCenter$} />
        </EuiHeaderSectionItem>
      </>
    );
  };

  const renderRightControls = () => {
    const hasNavControlsExpandedRight = hasValue(navControlsExpandedRight);
    const hasRightControls = hasValue(currentRightControls);
    const hasNavControlsRight = hasValue(navControlsRight);

    if (
      !hasRightControls &&
      !hasNavControlsExpandedRight &&
      !hasNavControlsRight &&
      useUpdatedHeader
    ) {
      return null;
    }

    return (
      <>
        {useUpdatedHeader && (
          <EuiHeaderSectionItem border="none">
            <HeaderNavControls navControls$={observables.navControlsExpandedRight$} />
          </EuiHeaderSectionItem>
        )}

        {useUpdatedHeader && (
          <EuiHeaderSectionItem border="none">
            <HeaderControlsContainer
              data-test-subj="headerRightControl"
              controls$={application.currentRightControls$}
            />
          </EuiHeaderSectionItem>
        )}

        <EuiHeaderSectionItem border={useUpdatedHeader ? 'none' : 'left'}>
          <HeaderNavControls side="right" navControls$={observables.navControlsRight$} />
        </EuiHeaderSectionItem>
      </>
    );
  };
  const renderActionMenu = () => {
    const hasActionMenu = hasValue(currentActionMenu);

    if (!hasActionMenu && useUpdatedHeader) {
      return null;
    }

    return (
      <EuiHeaderSectionItem border="none" className="headerAppActionMenuSection">
        <HeaderActionMenu actionMenu$={application.currentActionMenu$} />
      </EuiHeaderSectionItem>
    );
  };

  const renderBadge = () => {
    const hasBadge = hasValue(observableBadge);
    const hasCurrentBadgeControls = hasValue(currentBadgeControls);

    if (!hasBadge && !hasCurrentBadgeControls && useUpdatedHeader) {
      return null;
    }

    return (
      <>
        {useUpdatedHeader && (
          <EuiHeaderSectionItem border="none">
            <HeaderControlsContainer
              data-test-subj="headerBadgeControl"
              controls$={application.currentBadgeControls$}
            />
          </EuiHeaderSectionItem>
        )}

        {/* Nav controls badge */}
        <EuiHeaderSectionItem border="none">
          <HeaderBadge badge$={observables.badge$} />
        </EuiHeaderSectionItem>
      </>
    );
  };

  const renderRecentItems = () => (
    <EuiHeaderSectionItem border={useUpdatedHeader ? 'none' : 'right'}>
      <RecentItems
        http={http}
        navLinks$={observables.navLinks$}
        basePath={basePath}
        recentlyAccessed$={observables.recentlyAccessed$}
        workspaceList$={observables.workspaceList$}
        navigateToUrl={application.navigateToUrl}
        renderBreadcrumbs={renderBreadcrumbs(true, true)}
        buttonSize={useApplicationHeader ? 's' : 'xs'}
        loadingCount$={observables.loadingCount$}
        workspaceEnabled={application.capabilities.workspaces.enabled}
      />
    </EuiHeaderSectionItem>
  );
  const renderPrimaryHeaderRight = () => (
    <EuiHeaderSectionItem border="none">
      <HeaderNavControls navControls$={observables.navControlsPrimaryHeaderRight$} />
    </EuiHeaderSectionItem>
  );

  const leftControls = renderLeftControls();
  const centerControls = renderCenterControls();
  const rightControls = renderRightControls();
  const actionMenu = renderActionMenu();
  const badge = renderBadge();

  // Last breadcrumb = page title. On the dashboards listing breadcrumbs = ["Dashboards"] (1 item).
  // On an open dashboard breadcrumbs = ["Dashboards", "Name"] (2+ items) — show the dashboard name.
  const pageTitle = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1].text : '';

  // Hide the fixed title row for apps that render their own page header,
  // and also for the dashboards listing (no specific dashboard open).
  const hideTitleRow =
    APPS_WITHOUT_TITLE.has(currentAppId ?? '') ||
    (currentAppId === 'dashboards' && breadcrumbs.length <= 1);

  // Some apps (Dev Tools, Management) have no query bar — don't render the action row at all.
  // Body padding-top = 50px (navbar only) so content starts right below.
  const hideActionRow = APPS_WITHOUT_ACTIONROW.has(currentAppId ?? '');

  // Compute the total header height that content must be offset below:
  //   50px  (LR navbar)
  // + 36px  (title row, when shown)
  // + 40px  (action row, when shown)
  const topOffset = hideActionRow ? 50 : hideTitleRow ? 90 : 126;

  const renderLegacyHeader = () => (
    <>
      {/* Permanent left sidebar with nav icons */}
      <NmLeftNav
        navLinks$={observables.navLinks$}
        recentlyAccessed$={observables.recentlyAccessed$}
        basePath={basePath}
        navigateToApp={application.navigateToApp}
        navigateToUrl={application.navigateToUrl}
        appId$={application.currentAppId$}
      />

      {/* Row 1: Page title — shown only when a specific dashboard is open */}
      {!hideTitleRow && (
        <div
          style={{
            position: 'fixed',
            top: '50px',
            left: '48px',
            right: 0,
            zIndex: 1000,
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            backgroundColor: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            overflow: 'hidden',
            whiteSpace: 'nowrap' as const,
            textOverflow: 'ellipsis',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{pageTitle}</span>
        </div>
      )}

      {/* Dynamic overrides: body padding-top and app-wrapper height based on topOffset. */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
        body, body.coreSystemRootDomElement,
        body:not(.headerIsExpanded):not(.headerIsDense),
        body.euiBody--headerIsFixed,
        body.ouiBody--headerIsFixed {
          padding-top: ${topOffset}px !important;
        }
        .app-wrapper {
          min-height: calc(100vh - ${topOffset}px) !important;
        }
      `,
        }}
      />

      {/* Row 2: Action buttons + search bar — hidden for apps that have no query bar */}
      {!hideActionRow && (
        <div
          className="nm-action-row"
          style={{
            position: 'fixed',
            top: hideTitleRow ? '50px' : '86px',
            left: '48px',
            right: 0,
            zIndex: 1000,
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
            backgroundColor: '#fff',
          }}
        >
          {actionMenu}
          {centerControls}
          {rightControls}
        </div>
      )}
    </>
  );

  const renderPageHeader = () => (
    <div style={sidecarPaddingStyle}>
      <EuiHeader className="primaryHeader newTopNavHeader">
        {renderNavToggle()}

        <EuiHeaderSection grow={false}>{renderRecentItems()}</EuiHeaderSection>

        {renderBreadcrumbs(false, false)}

        {renderPrimaryHeaderRight()}
      </EuiHeader>

      {/* Secondary header */}
      <EuiHeader className="newTopNavHeader">
        <EuiFlexGroup
          justifyContent="spaceBetween"
          gutterSize="none"
          className="secondaryPageHeaderFlexGroup"
        >
          {/* Left Section */}
          <EuiHeaderSection side="left" grow={true} style={{ flexShrink: 1 }}>
            <EuiFlexGroup gutterSize="s" className="leftSecondaryPageHeaderFlexGroup">
              <EuiFlexItem grow={false}>
                <EuiHeaderSectionItem border="none" data-test-subj="headerApplicationTitle">
                  <EuiTitle size="l" className="newTopNavHeaderTitle">
                    {breadcrumbs && (
                      <h1 className="eui-textBreakWord">
                        {breadcrumbs[breadcrumbs.length - 1]?.text}
                      </h1>
                    )}
                  </EuiTitle>
                </EuiHeaderSectionItem>
              </EuiFlexItem>

              {badge && <EuiFlexItem grow={false}>{badge}</EuiFlexItem>}

              {leftControls && <EuiFlexItem grow={false}>{leftControls}</EuiFlexItem>}
            </EuiFlexGroup>
          </EuiHeaderSection>

          {/* Right Section */}
          <EuiHeaderSection side="right">
            <EuiFlexGroup gutterSize="s">
              {centerControls && <EuiFlexItem>{centerControls}</EuiFlexItem>}

              {actionMenu && <EuiFlexItem>{actionMenu}</EuiFlexItem>}

              {rightControls && <EuiFlexItem> {rightControls}</EuiFlexItem>}
            </EuiFlexGroup>
          </EuiHeaderSection>
        </EuiFlexGroup>
      </EuiHeader>

      <EuiHeader className="newTopNavHeader">
        <HeaderControlsContainer
          data-test-subj="headerDescriptionControl"
          controls$={application.currentDescriptionControls$}
          className="headerDescriptionControl"
        />
      </EuiHeader>

      <EuiHeader className="newTopNavHeader">
        <HeaderControlsContainer
          data-test-subj="headerBottomControl"
          controls$={application.currentBottomControls$}
          className="headerBottomControl"
        />
      </EuiHeader>
    </div>
  );

  const renderApplicationHeader = () => (
    <div>
      <EuiHeader className="primaryApplicationHeader newTopNavHeader" style={sidecarPaddingStyle}>
        {renderNavToggle()}
        <EuiHeaderSection side="left" grow={true}>
          {renderRecentItems()}
          {actionMenu}
        </EuiHeaderSection>
        <EuiHeaderSection side="right">
          {rightControls}
          {renderPrimaryHeaderRight()}
        </EuiHeaderSection>
      </EuiHeader>
      <div id="applicationHeaderFilterBar" />
    </div>
  );

  const renderHeader = () => {
    return useApplicationHeader ? renderApplicationHeader() : renderPageHeader();
  };

  return (
    <>
      {/* LogRhythm top navigation bar — rendered as fixed overlay above OSD header.
          Background is set inline so it paints immediately before React mounts the
          Navbar component, preventing a blank flash. */}
      <div
        id="nm-navbar-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 19999,
          height: '50px',
          pointerEvents: 'auto',
          overflow: 'visible',
          background: navbarReady
            ? document.documentElement.classList.contains('Night')
              ? 'linear-gradient(#575a5c, #424446)'
              : 'linear-gradient(#e6e6e6, #d4d4d4)'
            : '#fff',
        }}
      >
        <LogRhythmNavbar />
      </div>

      {/* CSS for LR navbar positioning and dropdown visibility */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
          body, body.coreSystemRootDomElement {
            margin-top: 0 !important;
            padding-top: 90px !important;
            padding-left: 48px !important;
            background-color: #fff !important;
          }
          /* White background for all page layout containers */
          .euiPage, .ouiPage,
          .euiPageContent, .ouiPageContent,
          .euiPageBody, .ouiPageBody,
          .euiPageSideBar, .ouiPageSideBar,
          .euiPageTemplate, .ouiPageTemplate,
          .euiPageTemplate__panelled, .euiPageTemplate__centeredContent,
          .application {
            background-color: #fff !important;
          }
          /* White background on ALL form controls, inputs, textareas, and date pickers.
             Use * child selector too so inner wrappers are covered. */
          .euiFormControlLayout, .ouiFormControlLayout,
          .euiFormControlLayout--group, .ouiFormControlLayout--group,
          .euiFormControlLayout__childrenWrapper,
          .ouiFormControlLayout__childrenWrapper,
          .euiFieldText, .ouiFieldText,
          .euiFieldSearch, .ouiFieldSearch,
          .euiFieldNumber, .ouiFieldNumber,
          .euiTextArea, .ouiTextArea,
          .euiSelect, .ouiSelect,
          .euiSuperDatePicker, .ouiSuperDatePicker,
          .euiDatePickerRange, .ouiDatePickerRange,
          .euiSuperDatePickerShowDatesButton,
          .ouiSuperDatePickerShowDatesButton,
          .euiSuperDatePickerToggleQuickSelectButton,
          .ouiSuperDatePickerToggleQuickSelectButton,
          .osdQueryBar__wrap,
          .osdQueryBar__textareaWrap,
          .globalQueryBar {
            background-color: #fff !important;
          }
          /* White on header/toolbar link containers */
          .euiHeaderLinks, .ouiHeaderLinks,
          .euiHeaderLinks__list, .ouiHeaderLinks__list,
          .euiHeader, .ouiHeader {
            background-color: #fff !important;
          }
          /* White on all sidebar/nav containers */
          .euiSideNav, .ouiSideNav,
          .mgtSideBarNav,
          .euiCollapsibleNavGroup, .ouiCollapsibleNavGroup {
            background-color: #fff !important;
          }
          /* Subtle uniform border on all search-bar controls so they match each other.
             The query bar wrapper has no native border — add one.
             The date picker button/range already has a border — soften it to the same shade. */
          .osdQueryBar__wrap,
          .globalQueryBar .euiFormControlLayout,
          .globalQueryBar .ouiFormControlLayout {
            border: 1px solid #d3d3d3 !important;
            border-radius: 4px !important;
          }
          .euiSuperDatePickerShowDatesButton,
          .ouiSuperDatePickerShowDatesButton,
          .euiSuperDatePickerToggleQuickSelectButton,
          .ouiSuperDatePickerToggleQuickSelectButton,
          .euiDatePickerRange,
          .ouiDatePickerRange {
            border-color: #d3d3d3 !important;
          }
          .navbar.navbar-fixed-top {
            z-index: 19999 !important;
            overflow: visible !important;
          }
          .navbar .dropdown-menu {
            z-index: 20000 !important;
            position: absolute !important;
            pointer-events: auto !important;
          }
          /* Ensure clicks on dropdown items are not blocked by fixed page-content rows */
          .navbar .open > .dropdown-menu {
            display: block !important;
          }
          #osd-top-nav-helper { display: none !important; }

          /* Strip EuiHeaderSectionItem borders inside the action-buttons row */
          .nm-action-row .ouiHeaderSectionItem::after,
          .nm-action-row .ouiHeaderSectionItem::before,
          .nm-action-row .euiHeaderSectionItem::after,
          .nm-action-row .euiHeaderSectionItem::before {
            display: none !important;
          }
          .nm-action-row .ouiHeaderSectionItem,
          .nm-action-row .euiHeaderSectionItem {
            border: none !important;
            box-shadow: none !important;
          }

          /* Match button/link text size to body text (16px).
             Fullscreen/Share/Clone/Edit are inside nm-action-row (portal).
             Refresh (ouiSuperUpdateButton) and Save Rule (ouiButton fill) render
             in-place via renderSearchBar(), outside nm-action-row, so we target
             them via their own stable container classes. */
          .nm-action-row .ouiButton__text,
          .nm-action-row .euiButton__text,
          .nm-action-row .ouiButtonEmpty__text,
          .nm-action-row .euiButtonEmpty__text {
            font-size: 16px !important;
          }
          .ouiSuperUpdateButton__text,
          .euiSuperUpdateButton__text {
            font-size: 16px !important;
          }
          .osdQueryBar .ouiButton__text,
          .osdQueryBar .euiButton__text {
            font-size: 16px !important;
          }

          /* Search textarea — vertically center single-line text within the control height */
          .osdQueryBar__textarea {
            padding-top: 9px !important;
            padding-bottom: 9px !important;
          }

          /* Hide the legacy collapsible nav flyout — replaced by NmLeftNav permanent sidebar */
          .ouiCollapsibleNav,
          .euiCollapsibleNav {
            display: none !important;
          }
        `,
        }}
      />

      <header className={className} data-test-subj="headerGlobalNav">
        <div id="globalHeaderBars">
          {/* renderLegacyExpandedHeader omitted — replaced by LogRhythm navbar */}
          {useUpdatedHeader ? renderHeader() : renderLegacyHeader()}
        </div>

        {navGroupEnabled ? (
          <CollapsibleNavGroupEnabled
            appId$={application.currentAppId$}
            collapsibleNavHeaderRender={collapsibleNavHeaderRender}
            id={navId}
            navLinks$={observables.navLinks$}
            isNavOpen={isNavOpen}
            basePath={basePath}
            navigateToApp={application.navigateToApp}
            navigateToUrl={application.navigateToUrl}
            closeNav={() => {
              setIsNavOpen(false);
              if (toggleCollapsibleNavRef.current) {
                toggleCollapsibleNavRef.current.focus();
              }
            }}
            customNavLink$={observables.customNavLink$}
            logos={logos}
            navGroupsMap$={observables.navGroupsMap$}
            navControlsLeftBottom$={observables.navControlsLeftBottom$}
            currentNavGroup$={observables.currentNavGroup$}
            setCurrentNavGroup={setCurrentNavGroup}
            capabilities={application.capabilities}
            currentWorkspace$={observables.currentWorkspace$}
            globalSearchCommands={globalSearchCommands}
          />
        ) : (
          <CollapsibleNav
            appId$={application.currentAppId$}
            collapsibleNavHeaderRender={collapsibleNavHeaderRender}
            id={navId}
            isLocked={isLocked}
            navLinks$={observables.navLinks$}
            recentlyAccessed$={observables.recentlyAccessed$}
            isNavOpen={isNavOpen}
            homeHref={homeHref}
            basePath={basePath}
            navigateToApp={application.navigateToApp}
            navigateToUrl={application.navigateToUrl}
            onIsLockedUpdate={onIsLockedUpdate}
            closeNav={() => {
              setIsNavOpen(false);
              if (toggleCollapsibleNavRef.current) {
                toggleCollapsibleNavRef.current.focus();
              }
            }}
            customNavLink$={observables.customNavLink$}
            logos={logos}
            workspaceEnabled={application.capabilities.workspaces.enabled}
          />
        )}
      </header>
    </>
  );
}
