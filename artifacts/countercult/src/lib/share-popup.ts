const PENDING_KEY = "cc_share_pending";

/** Call this right after a successful sign-in (before navigating away). */
export function flagSharePopup() {
  localStorage.setItem(PENDING_KEY, "1");
}