/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Copyright 2020 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

/*
 * Session expiry handling.
 *
 * OSD sits behind the nm-web-app auth proxy (osd-auth.php). When the session
 * expires the proxy answers with either:
 *   - 401 JSON (+ X-Auth-Required header) for requests it recognises as AJAX, or
 *   - a 200 HTML page that does `window.location.replace('/login')` for everything
 *     else. OSD's fetch calls (e.g. /internal/search/...) and lazily loaded JS
 *     chunks fall into this second bucket, so the app receives HTML instead of
 *     JSON/JS and renders a blank page.
 *
 * This module detects both cases and sends the browser to the login page. It must
 * be installed before OSD bootstraps so that requests made during core setup are
 * covered too.
 */

const LOGIN_URL = '/login';
const UNPROTECTED_PATHS = ['/', '/login', '/logout'];
const LOGIN_REDIRECT_MARKER = 'Redirecting to login';

let installed = false;
let redirecting = false;
let sessionCheckInFlight = false;

const isOnUnprotectedPage = () => UNPROTECTED_PATHS.includes(window.location.pathname);

const redirectToLogin = () => {
  if (redirecting || isOnUnprotectedPage()) return;
  redirecting = true;
  window.location.replace(LOGIN_URL);
};

const isLoginRedirectPage = (text: string) =>
  text.includes(LOGIN_REDIRECT_MARKER) && text.includes(LOGIN_URL);

const isLoginUrl = (url: string) => {
  try {
    return new URL(url, window.location.href).pathname === LOGIN_URL;
  } catch (e) {
    return false;
  }
};

const isSessionExpiredResponse = async (response: Response): Promise<boolean> => {
  if (response.status === 401 || response.headers.get('X-Auth-Required') === 'true') {
    return true;
  }
  if (response.redirected && isLoginUrl(response.url)) {
    return true;
  }
  // OSD never returns HTML to fetch() calls, so an HTML body here is the proxy's
  // login redirect page.
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) {
    return false;
  }
  try {
    return isLoginRedirectPage(await response.clone().text());
  } catch (e) {
    return false;
  }
};

const getBasePath = (): string => {
  try {
    const raw = document.querySelector('osd-injected-metadata')?.getAttribute('data');
    return (raw && JSON.parse(raw).basePath) || '';
  } catch (e) {
    return '';
  }
};

export const installSessionExpiryHandler = () => {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  // Asks the proxy whether the session is still valid. Used when a resource
  // (e.g. a JS chunk) fails to load and we can't inspect its response directly.
  const checkSession = async () => {
    if (sessionCheckInFlight || redirecting || isOnUnprotectedPage()) return;
    sessionCheckInFlight = true;
    try {
      const response = await originalFetch(`${getBasePath()}/api/status`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (await isSessionExpiredResponse(response)) {
        redirectToLogin();
      }
    } catch (e) {
      // network error; nothing to do
    } finally {
      sessionCheckInFlight = false;
    }
  };

  // OSD's HTTP service uses window.fetch for all API calls. When the session has
  // expired, redirect and return a never-settling promise so no error toasts or
  // half-rendered error states appear while the browser navigates away.
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    if (!isOnUnprotectedPage() && (await isSessionExpiredResponse(response))) {
      redirectToLogin();
      return new Promise<Response>(() => {});
    }
    return response;
  };

  // Some embedded/legacy components still use XMLHttpRequest.
  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body?: BodyInit | Document | null) {
    this.addEventListener('readystatechange', () => {
      if (this.readyState !== 4) return;
      if (this.status === 401 || this.getResponseHeader('X-Auth-Required') === 'true') {
        redirectToLogin();
        return;
      }
      const contentType = this.getResponseHeader('Content-Type') || '';
      if (
        contentType.includes('text/html') &&
        (this.responseType === '' || this.responseType === 'text') &&
        isLoginRedirectPage(this.responseText)
      ) {
        redirectToLogin();
      }
    });
    return originalXHRSend.call(this, body);
  };

  // Lazily loaded app chunks (Discover, Visualize, Dashboard, ...) come back as the
  // proxy's HTML page once the session expires. That surfaces as a script load
  // error, a SyntaxError ("Unexpected token '<'") or a rejected ChunkLoadError.
  window.addEventListener(
    'error',
    (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLScriptElement || target instanceof HTMLLinkElement) {
        checkSession();
        return;
      }
      if ((event as ErrorEvent).error instanceof SyntaxError) {
        checkSession();
      }
    },
    true
  );

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (
      reason &&
      (reason.name === 'ChunkLoadError' ||
        /Loading (CSS )?chunk/i.test(String(reason.message)) ||
        reason.response?.status === 401)
    ) {
      checkSession();
    }
  });
};
