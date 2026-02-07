import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import Markdown from "../../components/Markdown";
import { getLocalized, formatDate, formatDateTime } from "../certificates/utils";
import "./certificateDetail.css";

const CertificateDetail = ({
  loading,
  error,
  data,
  onRequest,
  onCancel,
  onReRequest,
  onRefresh,
}) => {
  const { t, i18n } = useTranslation();
  const [actionLoading, setActionLoading] = useState(false);

  const lang = i18n.language || "sv";

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
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error) {
    return (
      <MainContent>
        <p className="error-message">{error}</p>
        <Link to="/certificates" className="back-link">
          {t("backToCertificates")}
        </Link>
      </MainContent>
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
    <MainContent>
      <Link to="/certificates" className="back-link">
        &larr; {t("backToCertificates")}
      </Link>

      {/* Certificate Info */}
      <section className="certificate-header">
        <h2 className="certificate-title">{getLocalized(certificate.name, lang)}</h2>
        {certificate.description && (
          <Markdown className="certificate-description">
            {getLocalized(certificate.description, lang)}
          </Markdown>
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
                <span className="detail-label">{t("certifiedOn")}:</span> {formatDate(myAttestation.confirmedAt || myAttestation.startDate, lang)}
              </p>
              {myAttestation.endDate ? (
                <p className="status-detail">
                  <span className="detail-label">{t("validUntil")}:</span> {formatDate(myAttestation.endDate, lang)}
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
                <span className="detail-label">{t("certifiedOn")}:</span> {formatDate(myAttestation.confirmedAt || myAttestation.startDate, lang)}
              </p>
              <p className="status-detail">
                <span className="detail-label">{t("expiredOn")}:</span> {formatDate(myAttestation.endDate, lang)}
              </p>
            </div>
            {myAttestation.comment && (
              <div className="certifier-comment-box">
                <span className="certifier-comment-label">{t("certifierComment")}</span>
                <p className="certifier-comment-text">{myAttestation.comment}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                onClick={() => handleAction(onRequest)}
                disabled={actionLoading}
              >
                {t("requestCertificate")}
              </Button>
            </div>
          </div>
        )}

        {isPending && (
          <div className="status-card pending">
            <div className="pending-header">
              <div className="pending-header-left">
                <span className="status-badge pending">{t("pendingRequest")}</span>
                {myAttestation.attempt > 1 && (
                  <span className="attempt-badge">
                    {t("attemptNumber", { number: myAttestation.attempt })}
                  </span>
                )}
              </div>
              <button
                className="!w-8 !h-8 !p-0 !m-0 flex items-center justify-center border-none rounded-full bg-amber-400 text-amber-900 text-xl cursor-pointer transition-all duration-200 hover:bg-amber-500 hover:rotate-45 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onRefresh}
                disabled={actionLoading}
                title={t("refresh")}
              >
                ↻
              </button>
            </div>
            <p className="pending-requested-at">
              {t("requestedAt")}: {formatDateTime(myAttestation.startDate, lang)}
            </p>
            {myAttestation.comment ? (
              <div className="certifier-comment-box highlight">
                <span className="certifier-comment-label">{t("certifierFeedback")}</span>
                <p className="certifier-comment-text">{myAttestation.comment}</p>
              </div>
            ) : (
              <p className="pending-waiting-message">
                {t("pendingRequestWaiting")}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleAction(onReRequest, myAttestation._id)}
                disabled={actionLoading}
              >
                {t("reRequest")}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleAction(onCancel, myAttestation._id)}
                disabled={actionLoading}
              >
                {t("cancelRequest")}
              </Button>
            </div>
          </div>
        )}

        {canRequest && !isExpired && (
          <div className="status-card available">
            <p>{t("canRequestCertificate")}</p>
            <Button
              onClick={() => handleAction(onRequest)}
              disabled={actionLoading}
            >
              {t("requestCertificate")}
            </Button>
          </div>
        )}
      </section>
    </MainContent>
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
  onRefresh: PropTypes.func.isRequired,
};

export default CertificateDetail;
