/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
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

/*
 * Copyright 2020 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React, { useCallback, useEffect, useState } from 'react';
import { SnackbarProvider } from 'notistack';
import { makeStyles } from '@material-ui/styles';
import { AuthContext, AuthContextValue } from '@logrhythm/nm-web-shared/contexts/auth_context';
import {
  BlockingProcessContext,
  BlockingProcessContextState,
} from '@logrhythm/nm-web-shared/contexts/blocking_process_context';
import BlockingProcessModal from '@logrhythm/nm-web-shared/components/blocking_process/blocking_process_modal';
import { Navbar } from '@logrhythm/nm-web-shared/components/navigation/navbar/navbar';
import Auth from '@logrhythm/nm-web-shared/services/auth';
import { useSessionSync } from '@logrhythm/nm-web-shared/hooks/session_sync_hooks';
import NotificationHandler from './notification_handler';

const useStyles = makeStyles(
  {
    snackbar: {
      maxWidth: '20vw',
      '& > div': {
        borderRadius: 0,
        font: '400 100%/1.4 Ubuntu,Tahoma,sans-serif',
        flexWrap: 'nowrap',
      },
      '& > div > div:first-child': {
        width: '100%',
      },
      '& a': {
        textDecoration: 'underline !important',
      },
    },
  },
  { name: 'Navbar' }
);

const AUTH_CACHE_KEY = 'nm_navbar_auth_cache';

const readCachedAuth = (): AuthContextValue => {
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore parse/storage errors
  }
  return undefined;
};

const LogRhythmNavbar = () => {
  const classes = useStyles();

  // Seed from cache so the navbar renders immediately on navigation; the real
  // auth check will overwrite it once it resolves.
  const [authState, setAuthState] = useState<AuthContextValue>(readCachedAuth);

  const setAuthStateAndCache = useCallback((value: AuthContextValue) => {
    // The Auth service fires immediately with undefined before getCurrentUser resolves.
    // Ignore undefined updates when we already have a valid cached value so we never
    // blank out a navbar that is already showing.
    setAuthState((prev) => {
      if (value === undefined && prev !== undefined) return prev;
      if (value !== undefined) {
        try {
          sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(value));
        } catch (e) {
          // ignore storage errors
        }
      }
      return value;
    });
  }, []);

  const checkingToken = useSessionSync('token');
  const checkingNotifications = useSessionSync('notificationsAlreadySeen');

  // Bootstrap JS is not bundled in OSD, so we polyfill data-toggle="dropdown"
  // with a delegated click handler that toggles the "open" class on the parent.
  const handleDropdownToggle = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const toggle = target.closest('[data-toggle="dropdown"]') as HTMLElement | null;
    if (!toggle) return;
    e.preventDefault();
    e.stopPropagation();
    const parent = toggle.closest('.dropdown') as HTMLElement | null;
    if (!parent) return;
    const wasOpen = parent.classList.contains('open');
    // Close all open dropdowns first
    document.querySelectorAll('.dropdown.open').forEach((el) => el.classList.remove('open'));
    if (!wasOpen) parent.classList.add('open');
  }, []);

  const handleCloseDropdowns = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Close when clicking outside any dropdown, or on a dropdown item (navigation)
    if (!target.closest('.dropdown') || target.closest('.dropdown-item')) {
      document.querySelectorAll('.dropdown.open').forEach((el) => el.classList.remove('open'));
    }
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleDropdownToggle, true);
    document.addEventListener('click', handleCloseDropdowns, false);
    return () => {
      document.removeEventListener('click', handleDropdownToggle, true);
      document.removeEventListener('click', handleCloseDropdowns, false);
    };
  }, [handleDropdownToggle, handleCloseDropdowns]);

  const [blockingProcessMsg, setBlockingProcessMsg] = useState<string>('');
  const blockingProcessContextState: BlockingProcessContextState = {
    message: blockingProcessMsg,
    block: setBlockingProcessMsg,
    unblock: () => setBlockingProcessMsg(''),
  };

  useEffect(() => {
    if (checkingToken || checkingNotifications) {
      return;
    }

    const unsub = Auth.subscribe(setAuthStateAndCache);

    Auth.getCurrentUser();

    return unsub;
  }, [checkingToken, checkingNotifications, setAuthStateAndCache]);

  if (authState === undefined) {
    return null;
  }

  return (
    <AuthContext.Provider value={[authState, setAuthState]}>
      <BlockingProcessContext.Provider value={blockingProcessContextState}>
        <SnackbarProvider
          maxSnack={7}
          classes={{ root: classes.snackbar }}
          autoHideDuration={3000}
          hideIconVariant={true}
        >
          <>
            <Navbar />
            <NotificationHandler />
            <BlockingProcessModal />
          </>
        </SnackbarProvider>
      </BlockingProcessContext.Provider>
    </AuthContext.Provider>
  );
};

export { LogRhythmNavbar };
