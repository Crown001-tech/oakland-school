/**
 * Role switcher: one-tap sign-in as Oakland's role accounts, with no password, so the owner and
 * prospective schools can look around Oakland as each role. It has no imports so the layout can use it.
 *
 * Nothing is enabled by default. Choose one with an environment variable:
 *   ROLE_SWITCHER=public   anyone who visits can use it (the demo, on a deployment that holds only
 *                          the owner's test records). Set it before the deployment builds.
 *   LOCAL_ROLE_SWITCHER=true   only under `next dev`, and only for requests addressed to localhost.
 *
 * The API re-checks the same rule on every request.
 */

export function isPublicRoleSwitcher(): boolean {
  return process.env.ROLE_SWITCHER === 'public';
}

function isLocalSwitcherFlagOn(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.LOCAL_ROLE_SWITCHER === 'true';
}

/** Whether the switcher bar should be drawn at all. */
export function isLocalReviewFlagOn(): boolean {
  return isPublicRoleSwitcher() || isLocalSwitcherFlagOn();
}

export function isLoopbackHost(hostHeader: string | null | undefined): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.trim().toLowerCase().replace(/:\d+$/, '');
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/** Whether this request may switch role. */
export function isLocalReviewAllowed(hostHeader: string | null | undefined): boolean {
  return isPublicRoleSwitcher() || (isLocalSwitcherFlagOn() && isLoopbackHost(hostHeader));
}
