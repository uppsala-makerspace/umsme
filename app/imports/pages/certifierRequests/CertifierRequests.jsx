import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "./certifierRequests.css";

const CertifierRequests = ({
  loading,
  pendingRequests,
  recentlyConfirmed,
}) => {
  const { t, i18n } = useTranslation();

  const lang = i18n.language || "sv";

  const getLocalized = (obj) => {
    if (!obj) return "";
    return obj[lang] || obj.sv || obj.en || "";
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US");
  };

  if (loading) {
    return (
      <div className="certifier-container">
        <p className="text-center">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="certifier-container">
      <Link to="/certificates" className="back-link">
        &larr; {t("backToCertificates")}
      </Link>

      <h2 className="certifier-title">{t("confirmRequestsTab")}</h2>

      {/* Pending Requests */}
      {pendingRequests.length > 0 ? (
        <section className="certifier-section">
          <h3 className="section-title">{t("requestsToConfirm")}</h3>
          <ul className="request-list">
            {pendingRequests.map((att) => (
              <li key={att._id} className="request-item">
                <Link to={`/certifier-requests/${att._id}`} className="request-link">
                  <div className="request-info">
                    <span className="requester-name">{att.requesterName}</span>
                    <span className="certificate-name">
                      {getLocalized(att.certificate?.name)}
                    </span>
                    {att.attempt > 1 && (
                      <span className="attempt-badge">
                        {t("attemptNumber", { number: att.attempt })}
                      </span>
                    )}
                  </div>
                  <span className="link-arrow">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="certifier-section">
          <p className="empty-message">{t("noPendingRequests")}</p>
        </section>
      )}

      {/* Recently Confirmed */}
      {recentlyConfirmed.length > 0 && (
        <section className="certifier-section">
          <h3 className="section-title">{t("recentlyConfirmed")}</h3>
          <ul className="request-list">
            {recentlyConfirmed.map((att) => (
              <li key={att._id} className="request-item confirmed">
                <Link to={`/certifier-requests/${att._id}`} className="request-link">
                  <div className="request-info">
                    <span className="requester-name">{att.requesterName}</span>
                    <span className="certificate-name">
                      {getLocalized(att.certificate?.name)}
                    </span>
                    <span className="confirmed-badge">{t("confirmed")}</span>
                    {att.endDate && (
                      <span className="validity-date">
                        {t("validUntil")}: {formatDate(att.endDate)}
                      </span>
                    )}
                  </div>
                  <span className="link-arrow">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

CertifierRequests.propTypes = {
  loading: PropTypes.bool,
  pendingRequests: PropTypes.array,
  recentlyConfirmed: PropTypes.array,
};

CertifierRequests.defaultProps = {
  loading: false,
  pendingRequests: [],
  recentlyConfirmed: [],
};

export default CertifierRequests;
