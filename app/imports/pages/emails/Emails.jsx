import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import Button from "../../components/Button";
import Input from "../../components/Input";

const Pill = ({ tone, children }) => (
  <span className={`inline-block text-xs font-semibold rounded-full py-0.5 px-2 ${tone}`}>{children}</span>
);

const linkButton = "bg-transparent border-none p-0 text-sm text-brand-green underline cursor-pointer hover:opacity-80 disabled:opacity-50";

/**
 * The account's email addresses: which one is primary (where mail goes) and
 * which are verified, with what can be done with each, and adding one. An
 * address that belongs to another account (`taken`) offers to ask to merge
 * that account into this one.
 *
 * @param {{ loading, emails: Array<{address, verified, primary}>, busy, error, notice,
 *           taken: string|null, onAdd, onResend, onRemove, onMakePrimary, onRequestMerge }} props
 */
const Emails = ({ loading, emails, busy, error, notice, taken, onAdd, onResend, onRemove, onMakePrimary, onRequestMerge }) => {
  const { t } = useTranslation();
  const [address, setAddress] = useState("");

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  return (
    <MainContent>
      <h2 className="text-xl font-bold mb-1">{t("emailsTitle")}</h2>
      <p className="text-sm text-gray-600 mb-4">{t("emailsInfo")}</p>

      {error && <p className="mb-3 p-3 rounded bg-red-50 text-red-800 text-sm" role="alert">{error}</p>}
      {notice && <p className="mb-3 p-3 rounded bg-green-50 text-green-800 text-sm" role="status">{notice}</p>}

      <ul className="list-none p-0 m-0 mb-6">
        {emails.map((e) => (
          <li key={e.address} className="mb-2 p-3 rounded-lg bg-white border border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold break-all">{e.address}</span>
              {e.primary && <Pill tone="bg-brand-green text-white">{t("emailPrimary")}</Pill>}
              {e.verified
                ? <Pill tone="bg-green-100 text-green-800">{t("emailVerified")}</Pill>
                : <Pill tone="bg-amber-100 text-amber-800">{t("emailNotVerified")}</Pill>}
            </div>
            {!e.primary && (
              <div className="flex flex-wrap gap-4 mt-2">
                {!e.verified && (
                  <button type="button" className={linkButton} disabled={busy} onClick={() => onResend(e.address)}>
                    {t("emailResend")}
                  </button>
                )}
                {e.verified && (
                  <button type="button" className={linkButton} disabled={busy} onClick={() => onMakePrimary(e.address)}>
                    {t("emailMakePrimary")}
                  </button>
                )}
                <button type="button" className={`${linkButton} text-red-700`} disabled={busy} onClick={() => onRemove(e.address)}>
                  {t("emailRemove")}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (await onAdd(address.trim())) setAddress("");
        }}
      >
        <label htmlFor="email-add" className="block font-semibold mb-1">{t("emailAdd")}</label>
        <div className="flex gap-2 items-start">
          <Input id="email-add" type="email" value={address} onChange={(e) => setAddress(e.target.value)} className="mb-0 flex-1" required />
          <Button type="submit" disabled={busy || !address.trim()}>{t("emailAddButton")}</Button>
        </div>
      </form>

      {taken && (
        <div className="mt-4 p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm">
          <p className="m-0 mb-2">{t("emailTaken", { address: taken })}</p>
          <Button variant="secondary" disabled={busy} onClick={() => onRequestMerge(taken)}>{t("emailRequestMerge")}</Button>
        </div>
      )}
    </MainContent>
  );
};

Emails.propTypes = {
  loading: PropTypes.bool,
  emails: PropTypes.arrayOf(PropTypes.shape({ address: PropTypes.string, verified: PropTypes.bool, primary: PropTypes.bool })),
  busy: PropTypes.bool,
  error: PropTypes.string,
  notice: PropTypes.string,
  taken: PropTypes.string,
  onAdd: PropTypes.func,
  onResend: PropTypes.func,
  onRemove: PropTypes.func,
  onMakePrimary: PropTypes.func,
  onRequestMerge: PropTypes.func,
};

Emails.defaultProps = {
  loading: false, emails: [], busy: false, error: null, notice: null, taken: null,
  onAdd: async () => true, onResend: () => {}, onRemove: () => {}, onMakePrimary: () => {}, onRequestMerge: () => {},
};

export default Emails;
