import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import Markdown from "../../components/Markdown";

/**
 * Status banner component showing liability approval status
 */
const StatusBanner = ({ status, t }) => {
  if (status === "approved") {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        <p className="font-medium">{t("liabilityApproved")}</p>
      </div>
    );
  }

  if (status === "outdated") {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        <p className="font-medium">{t("liabilityOutdated")}</p>
        <p className="text-sm mt-3">{t("liabilityOutdatedInfo")}</p>
      </div>
    );
  }

  // Not approved
  return (
    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
      <p className="font-medium">{t("liabilityNotApproved")}</p>
      <p className="text-sm mt-3">{t("liabilityReadAndApprove")}</p>
    </div>
  );
};

/**
 * Pure Liability component for displaying and approving liability documents.
 * @param {Object} props
 * @param {Date} props.documentDate - The date of the liability document
 * @param {Object} props.text - The liability document text object with language keys (e.g., { sv: "...", en: "..." })
 * @param {Date|null} props.approvedDate - The date of the approved liability (null if not approved)
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.approving - Whether approval is in progress
 * @param {function} props.onApprove - Callback when user approves the liability
 */
const Liability = ({
  documentDate,
  text,
  approvedDate,
  loading,
  approving,
  onApprove,
}) => {
  const { t, i18n } = useTranslation();
  const [hasAgreed, setHasAgreed] = useState(false);

  // Get the text for the current language, falling back to Swedish then English
  const currentLanguage = i18n.language || "sv";
  const localizedText = text?.[currentLanguage] || text?.sv || text?.en || "";

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (!localizedText) {
    return (
      <MainContent className="items-center justify-center pt-8">
        <p className="text-gray-600">{t("liabilityNotFound")}</p>
      </MainContent>
    );
  }

  // Determine approval status
  let status = "not_approved";
  if (approvedDate) {
    if (documentDate && approvedDate.getTime() === documentDate.getTime()) {
      status = "approved";
    } else {
      status = "outdated";
    }
  }

  const showApproveButton = status !== "approved";

  return (
    <MainContent>
      <StatusBanner status={status} t={t} />

      <Markdown className="mb-6">{localizedText}</Markdown>

      {showApproveButton && (
        <div className="pt-4 pb-20">
          <label htmlFor="liability-checkbox" className="flex items-start gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              id="liability-checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="mt-1 flex-shrink-0"
            />
            <span className="text-sm">
              {t("liabilityCheckbox")}
            </span>
          </label>
          <Button
            fullWidth
            onClick={onApprove}
            disabled={approving || !hasAgreed}
          >
            {approving ? t("loading") : t("liabilityApproveButton")}
          </Button>
        </div>
      )}
    </MainContent>
  );
};

export default Liability;
