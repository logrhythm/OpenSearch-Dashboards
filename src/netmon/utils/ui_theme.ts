/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Copyright 2020 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import { darkMode, euiThemeVars } from '@osd/ui-shared-deps/theme';

/*
 * NetMon Day/Night theme support.
 *
 * lr-style and the nm-web-shared components (top navbar, dropdowns, modals, tables)
 * pick their colours from a `Night` class on <html>. In the Kibana setup
 * nm-web-app's page template added that class from `theme:darkMode`; OSD renders
 * its own page, so we derive it from the OSD theme (`theme:darkMode`) here.
 */

export const isDarkMode = (): boolean => !!darkMode;

// Only `Night` is added: nm-web-shared treats a missing class as Day, and a global
// `Day` class would let lr-style's `.Day .table/.btn/...` rules restyle OSD in light mode.
export const applyUiThemeClass = (dark: boolean = isDarkMode()) => {
  if (typeof document === 'undefined') return;
  const classList = document.documentElement.classList;
  classList.toggle('Night', dark);
  if (dark) classList.remove('Day');
};

export interface NmThemeColors {
  /** Page, header, panel and sidebar background. */
  background: string;
  /** Inputs, query bar, date picker. */
  formBackground: string;
  /** Light borders around the query bar, date picker and sidebar. */
  border: string;
  /** Thin divider lines. */
  divider: string;
  /** Faint divider between list rows. */
  rowDivider: string;
  /** Hover / active background for left nav items. */
  hover: string;
  /** Hover background for list rows. */
  rowHover: string;
  text: string;
  subduedText: string;
  /** Background for JSON / code blocks. */
  codeBackground: string;
  /** Initial navbar container background before the navbar renders. */
  navbarPlaceholder: string;
}

const LIGHT_COLORS: NmThemeColors = {
  background: '#fff',
  formBackground: '#fff',
  border: '#d3d3d3',
  divider: '#e0e0e0',
  rowDivider: '#f0f0f0',
  hover: '#e8e8e8',
  rowHover: '#f5f5f5',
  text: '#343741',
  subduedText: '#6a717d',
  codeBackground: '#f5f7fa',
  navbarPlaceholder: '#fff',
};

const DARK_COLORS: NmThemeColors = {
  background: euiThemeVars.euiColorEmptyShade,
  formBackground: euiThemeVars.euiFormBackgroundColor,
  border: euiThemeVars.euiBorderColor,
  divider: euiThemeVars.euiBorderColor,
  rowDivider: euiThemeVars.euiColorLightestShade,
  hover: euiThemeVars.euiColorLightShade,
  rowHover: euiThemeVars.euiColorLightestShade,
  text: euiThemeVars.euiTextColor,
  subduedText: euiThemeVars.euiColorDarkShade,
  codeBackground: euiThemeVars.euiColorLightestShade,
  navbarPlaceholder: '#424446',
};

export const nmThemeColors: NmThemeColors = darkMode ? DARK_COLORS : LIGHT_COLORS;
