import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

/**
 * Shown on every page while the admin views the app as another user: who is
 * shown, that changes are disabled, and the way back.
 */
const ImpersonationBanner = ({ name, busy, onSwitchBack }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-purple-100 border-b border-purple-300 px-4 py-2 flex items-center justify-between gap-3 text-purple-900 text-sm">
      <div className="min-w-0">
        <div className="font-medium truncate">{t("impersonationViewingAs", { name })}</div>
        <div className="text-xs">{t("impersonationReadOnly")}</div>
      </div>
      <button
        onClick={onSwitchBack}
        disabled={busy}
        className="px-3 py-1 bg-purple-800 hover:bg-purple-900 disabled:opacity-50 rounded text-white font-medium shrink-0"
      >
        {t("impersonationSwitchBack")}
      </button>
    </div>
  );
};

ImpersonationBanner.propTypes = {
  name: PropTypes.string.isRequired,
  busy: PropTypes.bool,
  onSwitchBack: PropTypes.func.isRequired,
};

export default ImpersonationBanner;
