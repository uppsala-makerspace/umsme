import { Meteor } from 'meteor/meteor';
import { fetch, Headers } from 'meteor/fetch';

/**
 * The umsme-bank proxy in front of Swedbank (settings.bankproxy): signing in
 * with BankID for a personal number, and reading the account's transactions.
 * The proxy keeps a PHP session per sign-in; its cookie is kept here per
 * personal number.
 */

const sessions = {};

const headersFor = (pnr) => new Headers(sessions[pnr] ? { Cookie: `PHPSESSID=${sessions[pnr]}` } : {});

const keepSession = (pnr, response) => {
  const cookie = (response.headers.get('set-cookie') || '').split(';').map((s) => s.trim()).find((c) => c.startsWith('PHPSESSID='));
  if (cookie) sessions[pnr] = cookie.substring(10);
};

const base = () => Meteor.settings.bankproxy;

export const swedbankProxy = {
  /** The sign-in status: 'uninitiated', 'waiting' or 'ready'. */
  async check(pnr) {
    const response = await fetch(`${base()}check.php`, { headers: headersFor(pnr) });
    keepSession(pnr, response);
    return response.json();
  },
  /** Start a BankID sign-in; the QR code as base64 PNG. */
  async initiate(pnr) {
    return (await fetch(`${base()}initiate.php?pnr=${pnr}&base64=true`, { headers: headersFor(pnr) })).text();
  },
  async clear(pnr) {
    sessions[pnr] = undefined;
  },
  /** The account's latest transactions, as the proxy gives them. */
  async transactions(pnr) {
    return (await (await fetch(`${base()}transactions.php`, { headers: headersFor(pnr) })).json()).transactions;
  },
  /** A Swish transaction's message and payer. */
  async transaction(pnr, id) {
    return (await fetch(`${base()}transaction.php?id=${id}`, { headers: headersFor(pnr) })).json();
  },
};
