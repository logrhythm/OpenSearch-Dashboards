/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Copyright 2020 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import { EuiIcon } from '@elastic/eui';
import React, { useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import * as Rx from 'rxjs';
import { ChromeNavLink, ChromeRecentlyAccessedHistoryItem } from '../../core/public/chrome';
import { HttpStart } from '../../core/public/http';
import { InternalApplicationStart } from '../../core/public/application/types';

interface NmLeftNavProps {
  navLinks$: Rx.Observable<ChromeNavLink[]>;
  recentlyAccessed$: Rx.Observable<ChromeRecentlyAccessedHistoryItem[]>;
  basePath: HttpStart['basePath'];
  navigateToApp: InternalApplicationStart['navigateToApp'];
  navigateToUrl: InternalApplicationStart['navigateToUrl'];
  appId$: InternalApplicationStart['currentAppId$'];
}

const COLLAPSED_WIDTH = 48;
const EXPANDED_WIDTH = 200;

const NAV_ITEMS = [
  { id: 'discover', label: 'Discover', icon: 'discoverApp' as const },
  { id: 'visualize', label: 'Visualize', icon: 'visualizeApp' as const },
  { id: 'dashboards', label: 'Dashboard', icon: 'dashboardApp' as const },
  { id: 'dev_tools', label: 'Dev Tools', icon: 'wrench' as const },
  { id: 'management', label: 'Management', icon: 'managementApp' as const },
];

// Apps where the title row should be hidden (they provide their own page header)
export const APPS_WITHOUT_TITLE = new Set([
  'discover',
  'data-explorer',
  'visualize',
  'dev_tools',
  'management',
]);

// Apps with no query bar / action menu — skip the action row entirely
// so content appears flush below the navbar.
export const APPS_WITHOUT_ACTIONROW = new Set(['dev_tools', 'management']);

interface TooltipState {
  visible: boolean;
  label: string;
  top: number;
}

export function NmLeftNav({
  navLinks$,
  recentlyAccessed$,
  basePath,
  navigateToApp,
  navigateToUrl,
  appId$,
}: NmLeftNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, label: '', top: 0 });
  const sidebarRef = useRef<HTMLDivElement>(null);

  const navLinks = useObservable(navLinks$, []).filter((link) => !link.hidden && !link.disabled);
  const recentlyAccessed = useObservable(recentlyAccessed$, []);
  const currentAppId = useObservable(appId$, '');

  const width = isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  const handleNavItemClick = (id: string, path?: string) => {
    setIsExpanded(false);
    setTooltip({ visible: false, label: '', top: 0 });
    navigateToApp(id, path ? { path } : undefined);
  };

  const handleRecentClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    navigateToUrl(url);
    setShowRecent(false);
    setIsExpanded(false);
  };

  const showTooltip = (e: React.MouseEvent<HTMLDivElement>, label: string) => {
    if (isExpanded) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ visible: true, label, top: Math.round(rect.top + rect.height / 2) });
  };

  const hideTooltip = () => setTooltip({ visible: false, label: '', top: 0 });

  const rowStyle = (isActive: boolean, forceBg?: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: isExpanded ? 'flex-start' : 'center',
    padding: isExpanded ? '13px 12px' : '13px 0',
    cursor: 'pointer',
    borderRadius: '4px',
    gap: isExpanded ? '10px' : '0',
    transition: 'background-color 0.15s',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    userSelect: 'none' as const,
    backgroundColor: forceBg != null ? forceBg : 'transparent',
    color: '#343741',
  });

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: isExpanded ? 'inline' : 'none',
  };

  // Resolve icon type for a recently-accessed item by matching baseUrl prefix
  const getRecentIcon = (link: string): string => {
    const full = basePath.prepend(link);
    for (const nl of navLinks) {
      if (full.startsWith(nl.baseUrl) && nl.euiIconType) return nl.euiIconType as string;
    }
    return 'dashboardApp';
  };

  return (
    <>
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{
          position: 'fixed',
          top: '50px',
          left: 0,
          bottom: 0,
          width,
          zIndex: 1001,
          backgroundColor: '#fff',
          borderRight: '1px solid #d3d3d3',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {/* Recently viewed */}
        <div style={{ position: 'relative' }}>
          <div
            role="button"
            tabIndex={0}
            style={rowStyle(false, showRecent ? '#e8e8e8' : undefined)}
            onClick={() => setShowRecent(!showRecent)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setShowRecent(!showRecent);
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#e8e8e8';
              showTooltip(e, 'Recently viewed');
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = showRecent
                ? '#e8e8e8'
                : 'transparent';
              hideTooltip();
            }}
          >
            <EuiIcon type="clock" size="m" />
            <span style={labelStyle}>Recently viewed</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '2px 8px' }} />

        {/* Nav items */}
        {NAV_ITEMS.map(({ id, label, icon }) => {
          const isActive = currentAppId === id;
          return (
            <div
              key={id}
              role="button"
              tabIndex={0}
              style={rowStyle(isActive)}
              onClick={() =>
                id === 'dashboards' ? handleNavItemClick(id, '#/list') : handleNavItemClick(id)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (id === 'dashboards') handleNavItemClick(id, '#/list');
                  else handleNavItemClick(id);
                }
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#e8e8e8';
                showTooltip(e, label);
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                hideTooltip();
              }}
            >
              <EuiIcon type={icon} size="m" />
              <span style={labelStyle}>{label}</span>
            </div>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Expand / collapse toggle */}
        <div
          role="button"
          tabIndex={0}
          style={{ ...rowStyle(false), borderTop: '1px solid #e0e0e0' }}
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded);
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#e8e8e8';
            showTooltip(e, isExpanded ? 'Collapse' : 'Expand');
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            hideTooltip();
          }}
        >
          <EuiIcon type={isExpanded ? 'menuLeft' : 'menuRight'} size="m" />
          <span style={labelStyle}>Collapse</span>
        </div>
      </div>

      {/* Tooltip — grey pill with left-pointing arrow, flush against sidebar edge */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: width + 1,
            top: tooltip.top,
            transform: 'translateY(-50%)',
            zIndex: 20010,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '6px solid #555',
              flexShrink: 0,
            }}
          />
          <div
            style={{
              backgroundColor: '#555',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 500,
              padding: '4px 10px',
              borderRadius: '4px',
              whiteSpace: 'nowrap' as const,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            {tooltip.label}
          </div>
        </div>
      )}

      {/* Recently viewed flyout */}
      {showRecent && (
        <>
          <div
            role="button"
            tabIndex={-1}
            aria-label="Close recently viewed"
            style={{ position: 'fixed', inset: 0, zIndex: 20001 }}
            onClick={() => setShowRecent(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowRecent(false);
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: width,
              top: '50px',
              width: 280,
              maxHeight: 'calc(100vh - 50px)',
              overflowY: 'auto',
              backgroundColor: '#fff',
              border: '1px solid #d3d3d3',
              borderRadius: '0 0 4px 0',
              boxShadow: '4px 4px 12px rgba(0,0,0,0.12)',
              zIndex: 20002,
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                color: '#6a717d',
                borderBottom: '1px solid #e0e0e0',
                letterSpacing: '0.05em',
              }}
            >
              Recently viewed
            </div>
            {recentlyAccessed.length === 0 ? (
              <div style={{ padding: '14px', fontSize: '14px', color: '#6a717d' }}>
                No recently viewed items
              </div>
            ) : (
              recentlyAccessed.map((item) => {
                const href = basePath.prepend(item.link);
                const iconType = getRecentIcon(item.link);
                return (
                  <a
                    key={item.id}
                    href={href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 14px',
                      fontSize: '14px',
                      overflow: 'hidden',
                      borderBottom: '1px solid #f0f0f0',
                      color: '#343741',
                      textDecoration: 'none',
                    }}
                    onClick={(e) => handleRecentClick(e, href)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <EuiIcon type={iconType} size="s" style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                      }}
                    >
                      {item.label}
                    </span>
                  </a>
                );
              })
            )}
          </div>
        </>
      )}
    </>
  );
}
