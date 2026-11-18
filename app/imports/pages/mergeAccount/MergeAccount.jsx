import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import Button from "../../components/Button";

// Why a merge is left to us (reason codes from common/server/users/mergeRequests.js).
const REASON_KEYS = {
  staffRole: "mergeReasonStaffRole",
  oauthConflict: "mergeReasonOauthConflict",
  adminLogin: "mergeReasonAdminLogin",
  members: "mergeReasonMembers",
  other: "mergeReasonOther",
};

/**
 * The page a merge link opens: what merging the two accounts means, and
 * Confirm. `info.state` is ready, needsHelp, used, expired or invalid;
 * `result` is what confirming gave ({ merged, reasons }).
 */
const MergeAccount = ({ loading, info, result, busy, error, onConfirm }) => {
  const { t } = useTranslation();
  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }
  const box = "p-4 rounded-lg bg-white border border-gray-200";
  // Why we merge these for the member, and how to reach us.
  const reasons = result?.reasons || info.reasons || [];
  const help = (
    <>
      {info.kept && <p className="mt-0">{t("mergeNeedsHelpAccounts", { kept: info.kept, removed: info.removed })}</p>}
      <ul className="pl-5 my-2">
        {reasons.map((reason) => (
          <li key={reason.code} className="mb-1">
            {t(REASON_KEYS[reason.code] || REASON_KEYS.other)}
            {reason.details?.length > 0 && <span className="block text-sm text-gray-600">{reason.details.join(" ")}</span>}
          </li>
        ))}
      </ul>
      <p>{t("mergeNeedsHelp")}</p>
      <Link to="/contact" className="block no-underline">
        <Button fullWidth>{t("mergeContactUs")}</Button>
      </Link>
    </>
  );

  return (
    <MainContent>
      <h2 className="text-xl font-bold mb-4">{t("mergeTitle")}</h2>
      {error && <p className="mb-3 p-3 rounded bg-red-50 text-red-800 text-sm" role="alert">{error}</p>}
      {result?.merged ? (
        <div className={box} role="status">
          <p className="m-0">{t("mergeDone", { kept: info.kept, removed: info.removed })}</p>
        </div>
      ) : result && !result.merged ? (
        <div className={box}>{help}</div>
      ) : ["invalid", "used", "expired"].includes(info.state) ? (
        <div className={box}><p className="m-0">{t(info.state === "used" ? "mergeUsed" : "mergeInvalid")}</p></div>
      ) : info.state === "needsHelp" ? (
        <div className={box}>{help}</div>
      ) : (
        <div className={box}>
          <p className="mt-0">{t("mergeExplain", { kept: info.kept, removed: info.removed })}</p>
          {info.member && <p>{t("mergeMember", { name: info.member.name })}</p>}
          <p className="text-sm text-gray-600">{t("mergePassword", { kept: info.kept })}</p>
          <Button fullWidth disabled={busy} onClick={onConfirm}>{t("mergeConfirm")}</Button>
        </div>
      )}
    </MainContent>
  );
};

MergeAccount.propTypes = {
  loading: PropTypes.bool,
  info: PropTypes.object,
  result: PropTypes.object,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onConfirm: PropTypes.func,
};

MergeAccount.defaultProps = { loading: false, info: { state: "invalid" }, result: null, busy: false, error: null, onConfirm: () => {} };

export default MergeAccount;
