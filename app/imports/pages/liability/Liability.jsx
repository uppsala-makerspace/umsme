import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { marked } from "marked";

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

  // useMemo must be called before any early returns to comply with Rules of Hooks
  const renderedMarkdown = useMemo(() => {
    if (!localizedText) return "";
    return marked(localizedText);
  }, [localizedText]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-gray-600">{t("loading")}</p>
      </div>
    );
  }

  if (!localizedText) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-gray-600">{t("liabilityNotFound")}</p>
      </div>
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
    <div className="flex flex-col p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t("liabilityTitle")}</h1>

      <StatusBanner status={status} t={t} />

      <div
        className="prose prose-sm max-w-none mb-6 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
        dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
      />

      {showApproveButton && (
        <div className="sticky bottom-0 pt-2 pb-2">
          <div className="flex items-start mb-4">
            <input
              style={{width: "unset", margin: "10px 10px"}}
              type="checkbox"
              id="liability-checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="ml-2 mr-2"
            />
            <label htmlFor="liability-checkbox" className="text-sm cursor-pointer">
              {t("liabilityCheckbox")}
            </label>
          </div>
          <button
            className="form-button w-full py-3"
            onClick={onApprove}
            disabled={approving || !hasAgreed}
          >
            {approving ? t("loading") : t("liabilityApproveButton")}
          </button>
        </div>
      )}
    </div>
  );
};

export default Liability;
