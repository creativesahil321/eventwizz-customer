/**
 * Flip to `true` once the Laravel team ships
 * `GET /customer/newsletter/status` (docs/backend-contracts/newsletter-status-api.md).
 *
 * false (today): the customer subscription flag is read from the full
 *   /theme/settings payload (refetched on demand near the newsletter UI).
 * true: the flag comes from the lightweight status endpoint; the full theme is
 *   never refetched for it. This single constant switches the whole app over —
 *   no other code change needed. Afterwards the backend may drop
 *   is_newsletter_subscribed from /theme/settings.
 */
export const NEWSLETTER_STATUS_API_ENABLED = false;
