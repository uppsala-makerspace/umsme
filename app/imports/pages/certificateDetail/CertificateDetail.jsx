import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import "./certificateDetail.css";

const CertificateDetail = ({
  loading,
  error,
  data,
  onRequest,
  onCancel,
  onReRequest,
}) => {
  const { t, i18n } = useTranslation();
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

  const handleAction = async (action, ...args) => {
    setActionLoading(true);
    try {
      await action(...args);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="certificate-detail-container">
        <p className="text-center">{t("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="certificate-detail-container">
        <p className="error-message">{error}</p>
        <Link to="/certificates" className="back-link">
          {t("backToCertificates")}
        </Link>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { certificate, myAttestation } = data;
  const now = new Date();
  const isExpired = myAttestation?.isConfirmed && myAttestation?.endDate && new Date(myAttestation.endDate) <= now;
  const isValid = myAttestation?.isConfirmed && (!myAttestation?.endDate || new Date(myAttestation.endDate) > now);
  const isPending = myAttestation?.isPending;
  const canRequest = !myAttestation || isExpired;

  return (
    <div className="certificate-detail-container">
      <Link to="/certificates" className="back-link">
        &larr; {t("backToCertificates")}
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

      {/* Mandatory Certificate Notice */}
      {certificate.mandatory && (
        <div className="mandatory-notice">
          <span className="mandatory-notice-text">{t("mandatoryCertificateNotice")}</span>
          <span className="mandatory-icon">⭐</span>
        </div>
      )}

      {/* My Status */}
      <section className="detail-section">
        <h3 className="section-title">{t("myStatus")}</h3>

        {isValid && (
          <div className="status-card valid">
            <span className="status-badge valid">{t("certified")}</span>
            <div className="status-details">
              {myAttestation.certifierName && (
                <p className="status-detail">
                  <span className="detail-label">{t("certifiedBy")}:</span> {myAttestation.certifierName}
                </p>
              )}
              <p className="status-detail">
                <span className="detail-label">{t("certifiedOn")}:</span> {formatDate(myAttestation.confirmedAt || myAttestation.startDate)}
              </p>
              {myAttestation.endDate ? (
                <p className="status-detail">
                  <span className="detail-label">{t("validUntil")}:</span> {formatDate(myAttestation.endDate)}
                </p>
              ) : (
                <p className="status-detail">
                  <span className="detail-label">{t("validUntil")}:</span> {t("noExpiration")}
                </p>
              )}
            </div>
            {myAttestation.comment && (
              <div className="certifier-comment-box">
                <span className="certifier-comment-label">{t("certifierComment")}</span>
                <p className="certifier-comment-text">{myAttestation.comment}</p>
              </div>
            )}
          </div>
        )}

        {isExpired && (
          <div className="status-card expired">
            <span className="status-badge expired">{t("expired")}</span>
            <div className="status-details">
              {myAttestation.certifierName && (
                <p className="status-detail">
                  <span className="detail-label">{t("certifiedBy")}:</span> {myAttestation.certifierName}
                </p>
              )}
              <p className="status-detail">
                <span className="detail-label">{t("certifiedOn")}:</span> {formatDate(myAttestation.confirmedAt || myAttestation.startDate)}
              </p>
              <p className="status-detail">
                <span className="detail-label">{t("expiredOn")}:</span> {formatDate(myAttestation.endDate)}
              </p>
            </div>
            {myAttestation.comment && (
              <div className="certifier-comment-box">
                <span className="certifier-comment-label">{t("certifierComment")}</span>
                <p className="certifier-comment-text">{myAttestation.comment}</p>
              </div>
            )}
            <div className="action-buttons">
              <button
                className="btn btn-primary"
                onClick={() => handleAction(onRequest)}
                disabled={actionLoading}
              >
                {t("requestCertificate")}
              </button>
            </div>
          </div>
        )}

        {isPending && (
          <div className="status-card pending">
            <span className="status-badge pending">{t("pendingRequest")}</span>
            {myAttestation.attempt > 1 && (
              <span className="attempt-badge">
                {t("attemptNumber", { number: myAttestation.attempt })}
              </span>
            )}
            {myAttestation.comment && (
              <div className="certifier-comment-box highlight">
                <span className="certifier-comment-label">{t("certifierFeedback")}</span>
                <p className="certifier-comment-text">{myAttestation.comment}</p>
              </div>
            )}
            <div className="action-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => handleAction(onReRequest, myAttestation._id)}
                disabled={actionLoading}
              >
                {t("reRequest")}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleAction(onCancel, myAttestation._id)}
                disabled={actionLoading}
              >
                {t("cancelRequest")}
              </button>
            </div>
          </div>
        )}

        {canRequest && !isExpired && (
          <div className="status-card available">
            <p>{t("canRequestCertificate")}</p>
            <button
              className="btn btn-primary"
              onClick={() => handleAction(onRequest)}
              disabled={actionLoading}
            >
              {t("requestCertificate")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

CertificateDetail.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  data: PropTypes.shape({
    certificate: PropTypes.object,
    myAttestation: PropTypes.object,
  }),
  onRequest: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onReRequest: PropTypes.func.isRequired,
};

export default CertificateDetail;
