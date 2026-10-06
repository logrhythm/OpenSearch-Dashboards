/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Copyright 2020 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React, { useEffect, useRef } from 'react';

// Above the fixed LogRhythm navbar container (19999) and its dropdowns (20000).
const NM_BLOCKING_OVERLAY_Z_INDEX = '20005';

/**
 * Render inside an EuiModal to make that modal's overlay mask also cover the fixed
 * LogRhythm top menubar, so the menubar can't be used while the modal is open.
 *
 * EuiModal creates its own body-level OuiOverlayMask and doesn't accept props for it,
 * so we raise the mask that contains this element once it is mounted in the portal.
 */
export const NmBlockingOverlay = () => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mask = ref.current?.closest<HTMLElement>('.ouiOverlayMask, .euiOverlayMask');
    if (!mask) return;
    const previousZIndex = mask.style.zIndex;
    mask.style.zIndex = NM_BLOCKING_OVERLAY_Z_INDEX;
    return () => {
      mask.style.zIndex = previousZIndex;
    };
  }, []);

  return <span ref={ref} hidden />;
};
