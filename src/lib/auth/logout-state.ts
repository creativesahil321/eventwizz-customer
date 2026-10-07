/**
 * "A logout is running" flag. While set, the API client suppresses 401/403
 * toasts and permission guards skip their redirects, so a logout never races a
 * second redirect (e.g. to /unauthorized) or flashes error toasts.
 *
 * Kept in its own module (no imports) so the API client, stores and the logout
 * flow can all read it without circular dependencies.
 */
let logoutInProgress = false;

export function setLogoutInProgress(value: boolean): void {
  logoutInProgress = value;
}

export function getLogoutInProgress(): boolean {
  return logoutInProgress;
}
