import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import Markdown from "../../components/Markdown";

const CertifierRequestDetail = ({
  loading,
  error,
  data,
  onConfirm,
  onDeny,
  onSaveComments,
}) => {
  const { t, i18n } = useTranslation();
  const [comment, setComment] = useState("");
  const [privateComment, setPrivateComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const lang = i18n.language || "sv";

  const getLocalized = (obj) => {
    if (!obj) return "";
    return obj[lang] || obj.sv || obj.en || "";
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US");
  };

  const formatDateTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US")} ${d.toLocaleTimeString(lang === "sv" ? "sv-SE" : "en-US", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      await action(comment, privateComment);
    } finally {
      setActionLoading(false);
    }
  };

  // Initialize comments from existing data
  React.useEffect(() => {
    if (data?.attestation) {
      setComment(data.attestation.comment || "");
      setPrivateComment(data.attestation.privateComment || "");
    }
  }, [data?.attestation?.comment, data?.attestation?.privateComment]);

  const hasCommentChanges = () => {
    if (!data?.attestation) return false;
    return comment !== (data.attestation.comment || "") ||
           privateComment !== (data.attestation.privateComment || "");
  };

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error) {
    return (
      <MainContent>
        <p className="text-red-600 text-center p-8">{error}</p>
        <Link to="/certificates" state={{ tab: "requests" }} className="inline-block text-[#5fc86f] no-underline mb-4 text-sm hover:underline">
          {t("backToRequests")}
        </Link>
      </MainContent>
    );
  }

  if (!data) {
    return null;
  }

  const { certificate, attestation } = data;
  const isConfirmed = !!attestation.certifierId;

  return (
    <MainContent>
      <Link to="/certificates" state={{ tab: "requests" }} className="inline-block text-[#5fc86f] no-underline mb-4 text-sm hover:underline">
        &larr; {t("backToRequests")}
      </Link>

      {/* Certificate Info */}
      <section className="mb-8 pb-4 border-b-2 border-gray-200">
        <h2 className="text-2xl mb-3 text-gray-800">{getLocalized(certificate.name)}</h2>
        {certificate.description && (
          <Markdown className="text-gray-600 leading-relaxed mb-3">
            {getLocalized(certificate.description)}
          </Markdown>
        )}
        {certificate.defaultValidityDays && (
          <p className="text-sm text-gray-500">
            {t("validityPeriod")}: {certificate.defaultValidityDays} {t("daysUnit")}
          </p>
        )}
      </section>

      {/* Requester Info */}
      <section className="mb-6">
        <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">{t("requesterInfo")}</h3>
        <div className={`p-4 rounded-lg bg-white border border-gray-200 ${isConfirmed ? "border-l-4 border-l-[#5fc86f] bg-green-50" : "border-l-4 border-l-violet-500 bg-violet-50"}`}>
          <div className="flex flex-col gap-2">
            <p className="m-0 text-sm text-gray-600">
              <span className="font-semibold text-gray-700">{t("requester")}:</span> {attestation.requesterName}
            </p>
            <p className="m-0 text-sm text-gray-600">
              <span className="font-semibold text-gray-700">{t("requestedAt")}:</span> {formatDateTime(attestation.startDate)}
            </p>
            {attestation.attempt > 1 && (
              <p className="m-0 text-sm text-gray-600">
                <span className="font-semibold text-gray-700">{t("attempt")}:</span> {attestation.attempt}
              </p>
            )}
            {isConfirmed && (
              <>
                <p className="m-0 text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">{t("status")}:</span>{" "}
                  <span className="inline-block text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{t("confirmed")}</span>
                </p>
                {attestation.endDate && (
                  <p className="m-0 text-sm text-gray-600">
                    <span className="font-semibold text-gray-700">{t("validUntil")}:</span> {formatDate(attestation.endDate)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Comments Section */}
      <section className="mb-6">
        <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">{t("comments")}</h3>

        {/* Public Comment */}
        <div className="mb-5">
          <label className="block font-semibold text-gray-700 mb-1">{t("publicComment")}</label>
          <p className="text-xs text-gray-500 mb-2">{t("publicCommentDescription")}</p>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-md text-sm font-mono resize-vertical min-h-[80px] focus:outline-none focus:border-[#5fc86f] focus:ring-2 focus:ring-[#5fc86f]/20"
            placeholder={t("publicCommentPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        {/* Private Comment */}
        <div className="mb-5">
          <label className="block font-semibold text-gray-700 mb-1">{t("privateComment")}</label>
          <p className="text-xs text-gray-500 mb-2">{t("privateCommentDescription")}</p>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-md text-sm font-mono resize-vertical min-h-[80px] focus:outline-none focus:border-[#5fc86f] focus:ring-2 focus:ring-[#5fc86f]/20"
            placeholder={t("privateCommentPlaceholder")}
            value={privateComment}
            onChange={(e) => setPrivateComment(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          variant="secondary"
          onClick={() => handleAction(onSaveComments)}
          disabled={actionLoading || !hasCommentChanges()}
        >
          {t("saveComments")}
        </Button>
      </section>

      {/* Actions */}
      {!isConfirmed && (
        <section className="mb-6">
          <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">{t("actions")}</h3>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => handleAction(onConfirm)}
              disabled={actionLoading}
            >
              {t("confirmRequest")}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => handleAction(onDeny)}
              disabled={actionLoading}
            >
              {t("denyRequest")}
            </Button>
          </div>
        </section>
      )}
    </MainContent>
  );
};

CertifierRequestDetail.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  data: PropTypes.shape({
    certificate: PropTypes.object,
    attestation: PropTypes.object,
  }),
  onConfirm: PropTypes.func.isRequired,
  onDeny: PropTypes.func.isRequired,
  onSaveComments: PropTypes.func.isRequired,
};

export default CertifierRequestDetail;
