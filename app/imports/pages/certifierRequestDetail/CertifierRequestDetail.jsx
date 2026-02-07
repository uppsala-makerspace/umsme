import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";
import "./certifierRequestDetail.css";

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

  const renderMarkdown = (text) => {
    if (!text) return "";
    const html = marked.parse(text, { breaks: true });
    return DOMPurify.sanitize(html);
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
        <p className="text-center">{t("loading")}</p>
      </MainContent>
    );
  }

  if (error) {
    return (
      <MainContent>
        <p className="error-message">{error}</p>
        <Link to="/certificates" state={{ tab: "requests" }} className="back-link">
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
      <Link to="/certificates" state={{ tab: "requests" }} className="back-link">
        &larr; {t("backToRequests")}
      </Link>

      {/* Certificate Info */}
      <section className="certificate-header">
        <h2 className="certificate-title">{getLocalized(certificate.name)}</h2>
        {certificate.description && (
          <div
            className="certificate-description markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(getLocalized(certificate.description)) }}
          />
        )}
        {certificate.defaultValidityDays && (
          <p className="certificate-validity-info">
            {t("validityPeriod")}: {certificate.defaultValidityDays} {t("daysUnit")}
          </p>
        )}
      </section>

      {/* Requester Info */}
      <section className="detail-section">
        <h3 className="section-title">{t("requesterInfo")}</h3>
        <div className={`status-card ${isConfirmed ? "confirmed" : "pending"}`}>
          <div className="status-details">
            <p className="status-detail">
              <span className="detail-label">{t("requester")}:</span> {attestation.requesterName}
            </p>
            <p className="status-detail">
              <span className="detail-label">{t("requestedAt")}:</span> {formatDateTime(attestation.startDate)}
            </p>
            {attestation.attempt > 1 && (
              <p className="status-detail">
                <span className="detail-label">{t("attempt")}:</span> {attestation.attempt}
              </p>
            )}
            {isConfirmed && (
              <>
                <p className="status-detail">
                  <span className="detail-label">{t("status")}:</span>{" "}
                  <span className="confirmed-badge">{t("confirmed")}</span>
                </p>
                {attestation.endDate && (
                  <p className="status-detail">
                    <span className="detail-label">{t("validUntil")}:</span> {formatDate(attestation.endDate)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Comments Section */}
      <section className="detail-section">
        <h3 className="section-title">{t("comments")}</h3>

        {/* Public Comment */}
        <div className="comment-field">
          <label className="comment-label">{t("publicComment")}</label>
          <p className="comment-description">{t("publicCommentDescription")}</p>
          <textarea
            className="comment-textarea"
            placeholder={t("publicCommentPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        {/* Private Comment */}
        <div className="comment-field">
          <label className="comment-label">{t("privateComment")}</label>
          <p className="comment-description">{t("privateCommentDescription")}</p>
          <textarea
            className="comment-textarea"
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
        <section className="detail-section">
          <h3 className="section-title">{t("actions")}</h3>
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
