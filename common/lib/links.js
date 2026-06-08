import { Meteor } from 'meteor/meteor';

/**
 * Absolute links into the admin app.
 *
 * The admin app is served behind a reverse proxy, so `Meteor.absoluteUrl()`
 * (ROOT_URL) is not reliable. Instead the admin's public base URL is configured
 * explicitly in `Meteor.settings.public.adminUrl` (e.g.
 * "https://umsme.uppsalamakerspace.se", or "http://localhost:3000" in dev) and
 * read here. Available on both client and server since it lives under `public`.
 *
 * Set the same value in every app whose code needs to link to admin (the
 * member app links to admin from manager events; the admin app links to itself).
 */

export const adminBaseUrl = () => (Meteor.settings?.public?.adminUrl || '').replace(/\/+$/, '');

// Build an absolute admin URL for a path, or '' when adminUrl is not configured.
export const adminLink = (path = '') => {
  const base = adminBaseUrl();
  if (!base) return '';
  return `${base}/${String(path).replace(/^\/+/, '')}`;
};
