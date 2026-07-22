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

import dateMath from '@elastic/datemath';
import classNames from 'classnames';
import React, { useState, useEffect, useRef } from 'react';
import { i18n } from '@osd/i18n';

// Import with try-catch to handle missing nm-web-shared package gracefully
let convertQuery: (query: string) => Promise<string>;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  convertQuery = require('@logrhythm/nm-web-shared/services/query_mapping').convertQuery;
} catch (e) {
  convertQuery = (query: string): Promise<string> => Promise.resolve(query);
}

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSuperDatePicker,
  EuiCompressedFieldText,
  prettyDuration,
} from '@elastic/eui';
// @ts-ignore
import { EuiSuperUpdateButton, OnRefreshProps, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import { Toast } from 'src/core/public';
import { createPortal } from 'react-dom';
import { IDataPluginServices, IIndexPattern, TimeRange, TimeHistoryContract, Query } from '../..';
import {
  useOpenSearchDashboards,
  toMountPoint,
  withOpenSearchDashboards,
} from '../../../../opensearch_dashboards_react/public';
import QueryStringInputUI from './query_string_input';
import { doesKueryExpressionHaveLuceneSyntaxError, UI_SETTINGS } from '../../../common';
import { PersistedLog, getQueryLog } from '../../query';
import { NoDataPopover } from './no_data_popover';
import { showInvalidQueryToast } from '../../search';
import { SaveRule } from '../../../../../netmon/components/save_rule/save_rule';

// A query guaranteed to match zero documents. Used to clear panels when the
// user submits an invalid query instead of showing stale/all-data results.
const NO_MATCH_QUERY = '_id:__no_match_placeholder__';

// Detect "field:" patterns (no value after colon) that Lucene rejects.
function isMalformedLuceneQuery(queryText: string): boolean {
  const trimmed = queryText.trim();
  if (!trimmed) return false;
  return (
    /\b\w[\w.]*\s*:\s*$/.test(trimmed) || /\b\w[\w.]*\s*:\s+(?=\b\w[\w.]*\s*:\s*$)/.test(trimmed)
  );
}

const QueryStringInput = withOpenSearchDashboards(QueryStringInputUI);

// @internal
export interface QueryBarTopRowProps {
  query?: Query;
  onSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onRefresh?: (payload: { dateRange: TimeRange }) => void;
  dataTestSubj?: string;
  disableAutoFocus?: boolean;
  screenTitle?: string;
  indexPatterns?: Array<IIndexPattern | string>;
  isLoading?: boolean;
  prepend?: React.ComponentProps<typeof EuiCompressedFieldText>['prepend'];
  showQueryInput?: boolean;
  showDatePicker?: boolean;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  isRefreshPaused?: boolean;
  refreshInterval?: number;
  showAutoRefreshOnly?: boolean;
  onRefreshChange?: (options: { isPaused: boolean; refreshInterval: number }) => void;
  customSubmitButton?: any;
  isDirty: boolean;
  timeHistory?: TimeHistoryContract;
  indicateNoData?: boolean;
  datePickerRef?: React.RefObject<HTMLDivElement>;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function QueryBarTopRow(props: QueryBarTopRowProps) {
  const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);
  const [isQueryInputFocused, setIsQueryInputFocused] = useState(false);
  const [displayQuery, setDisplayQuery] = useState<Query | undefined>(props.query);

  const opensearchDashboards = useOpenSearchDashboards<IDataPluginServices>();
  const { uiSettings, notifications, storage, appName, docLinks } = opensearchDashboards.services;

  const osdDQLDocs: string = docLinks!.links.opensearchDashboards.dql.base;

  // Keep displayQuery in sync with external query changes (saved query load, X-clear, etc.)
  // Skip when the incoming query is the no-match placeholder we submitted ourselves.
  useEffect(() => {
    if (props.query && props.query.query !== NO_MATCH_QUERY) {
      setDisplayQuery(props.query);
    }
  }, [props.query]);

  // Enhanced CSS loading detection with rate limiting
  const useCSSLoaded = () => {
    const [cssLoaded, setCssLoaded] = useState(false);
    const maxRetries = useRef(20);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
      let retryCount = 0;

      const checkCSS = () => {
        if (retryCount >= maxRetries.current) {
          setCssLoaded(true);
          return;
        }

        const testEl = document.createElement('div');
        testEl.className = 'osdQueryBar';
        testEl.style.visibility = 'hidden';
        document.body.appendChild(testEl);

        const styles = window.getComputedStyle(testEl);
        const hasStyles = styles.padding !== '0px' || styles.paddingLeft !== '0px';

        document.body.removeChild(testEl);

        if (hasStyles) {
          setCssLoaded(true);
        } else {
          retryCount++;
          timeoutRef.current = setTimeout(checkCSS, 100);
        }
      };

      checkCSS();

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return cssLoaded;
  };

  const cssLoaded = useCSSLoaded();

  const queryLanguage = props.query && props.query.language;

  const persistedLog: PersistedLog | undefined = React.useMemo(
    () =>
      queryLanguage && uiSettings && storage && appName
        ? getQueryLog(uiSettings!, storage, appName, queryLanguage)
        : undefined,
    [appName, queryLanguage, uiSettings, storage]
  );

  function onClickSubmitButton(event: React.MouseEvent<HTMLButtonElement>) {
    if (persistedLog && props.query) {
      persistedLog.add(props.query.query);
    }
    event.preventDefault();
    if (
      props.query &&
      typeof props.query.query === 'string' &&
      isMalformedLuceneQuery(props.query.query)
    ) {
      showInvalidQueryToast();
      setDisplayQuery(props.query);
      onSubmit({ query: { ...props.query, query: NO_MATCH_QUERY }, dateRange: getDateRange() });
      return;
    }
    onSubmit({ query: props.query, dateRange: getDateRange() });
  }

  function getDateRange() {
    const defaultTimeSetting = uiSettings!.get(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);
    return {
      from: props.dateRangeFrom || defaultTimeSetting.from,
      to: props.dateRangeTo || defaultTimeSetting.to,
    };
  }

  function onQueryChange(query: Query) {
    props.onChange({
      query,
      dateRange: getDateRange(),
    });
  }

  function onChangeQueryInputFocus(isFocused: boolean) {
    setIsQueryInputFocused(isFocused);
  }

  function onTimeChange({
    start,
    end,
    isInvalid,
    isQuickSelection,
  }: {
    start: string;
    end: string;
    isInvalid: boolean;
    isQuickSelection: boolean;
  }) {
    setIsDateRangeInvalid(isInvalid);
    const retVal = {
      query: props.query,
      dateRange: {
        from: start,
        to: end,
      },
    };

    if (isQuickSelection) {
      props.onSubmit(retVal);
    } else {
      props.onChange(retVal);
    }
  }

  function onRefresh({ start, end }: OnRefreshProps) {
    const retVal = {
      dateRange: {
        from: start,
        to: end,
      },
    };
    if (props.onRefresh) {
      props.onRefresh(retVal);
    }
  }

  function onSubmit({ query: submitQuery, dateRange }: { query?: Query; dateRange: TimeRange }) {
    handleLuceneSyntaxWarning();

    if (props.timeHistory) {
      props.timeHistory.add(dateRange);
    }

    if (!submitQuery || !submitQuery.query || typeof submitQuery.query !== 'string') {
      props.onSubmit({ query: submitQuery, dateRange });
      return;
    }

    if (isMalformedLuceneQuery(submitQuery.query)) {
      showInvalidQueryToast();
      setDisplayQuery(submitQuery);
      props.onSubmit({ query: { ...submitQuery, query: NO_MATCH_QUERY }, dateRange });
      return;
    }

    convertQuery(submitQuery.query)
      .then((newQueryText) => {
        if (!submitQuery) return;
        const newQuery = { ...submitQuery, query: newQueryText };
        props.onChange({ query: newQuery, dateRange });
        props.onSubmit({ query: newQuery, dateRange });
      })
      .catch((err) => {
        console.warn( // eslint-disable-line
          'An error occurred trying to correct the provided query for capitalization.',
          err
        );
        props.onSubmit({ query: submitQuery, dateRange });
      });
  }

  function onInputSubmit(query: Query) {
    onSubmit({
      query,
      dateRange: getDateRange(),
    });
  }

  function toAbsoluteString(value: string, roundUp = false) {
    const valueAsMoment = dateMath.parse(value, { roundUp });
    if (!valueAsMoment) {
      return value;
    }
    return valueAsMoment.toISOString();
  }

  function renderQueryInput() {
    if (!shouldRenderQueryInput()) return;
    return (
      <EuiFlexItem>
        <QueryStringInput
          disableAutoFocus={props.disableAutoFocus}
          indexPatterns={props.indexPatterns!}
          prepend={props.prepend}
          query={displayQuery ?? props.query!}
          screenTitle={props.screenTitle}
          onChange={(newQuery) => {
            setDisplayQuery(newQuery);
            onQueryChange(newQuery);
          }}
          onChangeQueryInputFocus={onChangeQueryInputFocus}
          onSubmit={onInputSubmit}
          persistedLog={persistedLog}
          dataTestSubj={props.dataTestSubj}
        />
      </EuiFlexItem>
    );
  }

  function renderSharingMetaFields() {
    const { from, to } = getDateRange();
    const dateRangePretty = prettyDuration(
      toAbsoluteString(from),
      toAbsoluteString(to),
      [],
      uiSettings.get('dateFormat')
    );
    return (
      <div
        data-shared-timefilter-duration={dateRangePretty}
        data-test-subj="dataSharedTimefilterDuration"
      />
    );
  }

  function shouldRenderDatePicker(): boolean {
    return Boolean(props.showDatePicker || props.showAutoRefreshOnly);
  }

  function shouldRenderQueryInput(): boolean {
    return Boolean(props.showQueryInput && props.indexPatterns && props.query && storage);
  }

  function renderUpdateButton() {
    const button = props.customSubmitButton ? (
      React.cloneElement(props.customSubmitButton, { onClick: onClickSubmitButton })
    ) : (
      <EuiSuperUpdateButton
        needsUpdate={props.isDirty}
        isDisabled={isDateRangeInvalid}
        isLoading={props.isLoading}
        onClick={onClickSubmitButton}
        data-test-subj="querySubmitButton"
        aria-label={i18n.translate('data.query.queryBar.querySubmitButtonLabel', {
          defaultMessage: 'Submit query',
        })}
        compressed={true}
      />
    );

    if (!shouldRenderDatePicker()) {
      return button;
    }

    return (
      <NoDataPopover storage={storage} showNoDataPopover={props.indicateNoData}>
        <EuiFlexGroup responsive={false} gutterSize="s" justifyContent="flexStart">
          {renderDatePicker()}
          <EuiFlexItem grow={false}>{button}</EuiFlexItem>
        </EuiFlexGroup>
      </NoDataPopover>
    );
  }

  function renderDatePicker() {
    if (!shouldRenderDatePicker()) {
      return null;
    }

    let recentlyUsedRanges;
    if (props.timeHistory) {
      recentlyUsedRanges = props.timeHistory
        .get()
        .map(({ from, to }: { from: string; to: string }) => {
          return {
            start: from,
            end: to,
          };
        });
    }

    const commonlyUsedRanges = uiSettings!
      .get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES)
      .map(({ from, to, display }: { from: string; to: string; display: string }) => {
        return {
          start: from,
          end: to,
          label: display,
        };
      });

    const wrapperClasses = classNames('osdQueryBar__datePickerWrapper', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'osdQueryBar__datePickerWrapper-isHidden': isQueryInputFocused,
    });

    return (
      <EuiFlexItem className={wrapperClasses} grow={false}>
        <EuiSuperDatePicker
          start={props.dateRangeFrom}
          end={props.dateRangeTo}
          isPaused={props.isRefreshPaused}
          refreshInterval={props.refreshInterval}
          onTimeChange={onTimeChange}
          onRefresh={onRefresh}
          onRefreshChange={props.onRefreshChange}
          showUpdateButton={false}
          recentlyUsedRanges={recentlyUsedRanges}
          commonlyUsedRanges={commonlyUsedRanges}
          dateFormat={uiSettings!.get('dateFormat')}
          isAutoRefreshOnly={props.showAutoRefreshOnly}
          className="osdQueryBar__datePicker"
          data-test-subj="osdQueryBarDatePicker"
          compressed={true}
        />
      </EuiFlexItem>
    );
  }

  function handleLuceneSyntaxWarning() {
    if (!props.query) return;
    const { query, language } = props.query;
    if (
      language === 'kuery' &&
      typeof query === 'string' &&
      (!storage || !storage.get('luceneSyntaxWarningOptOut')) &&
      doesKueryExpressionHaveLuceneSyntaxError(query)
    ) {
      const toast = notifications!.toasts.addWarning({
        title: i18n.translate('data.query.queryBar.luceneSyntaxWarningTitle', {
          defaultMessage: 'Lucene syntax warning',
        }),
        text: toMountPoint(
          <div>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="data.query.queryBar.luceneSyntaxWarningMessage"
                  defaultMessage="It looks like you may be trying to use Lucene query syntax, although you
               have opensearchDashboards Query Language (DQL) selected. Please review the DQL docs {link}."
                  values={{
                    link: (
                      <EuiLink href={osdDQLDocs} target="_blank">
                        <FormattedMessage
                          id="data.query.queryBar.syntaxOptionsDescription.docsLinkText"
                          defaultMessage="here"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton size="s" onClick={() => onLuceneSyntaxWarningOptOut(toast)}>
                  <FormattedMessage
                    id="data.query.queryBar.luceneSyntaxWarningOptOutText"
                    defaultMessage="Don't show again"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ),
      });
    }
  }

  function onLuceneSyntaxWarningOptOut(toast: Toast) {
    if (!storage) return;
    storage.set('luceneSyntaxWarningOptOut', true);
    notifications!.toasts.remove(toast);
  }

  const currentQueryText =
    props.query && props.query.query ? (props.query.query as string) : '';

  const classes = classNames('osdQueryBar', {
    'osdQueryBar--withDatePicker': props.showDatePicker,
    'osdQueryBar--cssLoaded': cssLoaded,
  });

  const shouldUseDatePickerRef =
    props?.datePickerRef?.current &&
    (uiSettings.get(UI_SETTINGS.QUERY_ENHANCEMENTS_ENABLED) ||
      uiSettings.get('home:useNewHomePage'));

  return (
    <>
      <EuiFlexGroup
        className={classes}
        responsive={!!props.showDatePicker}
        gutterSize="s"
        justifyContent={cssLoaded ? 'flexEnd' : 'flexStart'}
        style={!cssLoaded ? { minHeight: '40px' } : undefined}
      >
        {renderQueryInput()}
        {renderSharingMetaFields()}
        <EuiFlexItem grow={false} className="osdQueryBar--hideEmpty" data-test-subj="osdQueryBar">
          {shouldUseDatePickerRef
            ? createPortal(renderUpdateButton(), props.datePickerRef!.current!)
            : renderUpdateButton()}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SaveRule query={currentQueryText} disabledForLanguage={queryLanguage !== 'lucene'} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

QueryBarTopRow.defaultProps = {
  showQueryInput: true,
  showDatePicker: true,
  showAutoRefreshOnly: false,
};
