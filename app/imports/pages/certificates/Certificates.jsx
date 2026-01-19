import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import "./certificates.css";

const Certificates = ({
  loading,
  certificates,
  myAttestations,
  isCertifier,
  pendingToConfirm,
  recentlyConfirmed,
}) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || "my");

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
      <div className="certificates-container">
        <p className="text-center">{t("loading")}</p>
      </div>
    );
  }

  // Categorize attestations
  const now = new Date();
  const myPending = myAttestations.filter((a) => !a.certifierId);
  const myConfirmed = myAttestations.filter((a) => a.certifierId);
  const myValid = myConfirmed.filter((a) => !a.endDate || new Date(a.endDate) > now);
  const myExpired = myConfirmed.filter((a) => a.endDate && new Date(a.endDate) <= now);

  // Get certificates available to request
  const myPendingCertIds = myPending.map((a) => a.certificateId);
  const myValidCertIds = myValid.map((a) => a.certificateId);
  const availableCertificates = certificates.filter(
    (c) => !myPendingCertIds.includes(c._id) && !myValidCertIds.includes(c._id)
  );

  // Count pending requests for certifier badge
  const pendingRequestsCount = pendingToConfirm.length;

  return (
    <div className="certificates-container">
      {/* Show tabs only for certifiers, otherwise just a heading */}
      {isCertifier ? (
        <div className="certificates-tabs">
          <button
            className={`tab-button ${activeTab === "my" ? "active" : ""}`}
            onClick={() => setActiveTab("my")}
          >
            {t("myCertificatesTab")}
          </button>
          <button
            className={`tab-button ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            {t("requestsTab")}
            {pendingRequestsCount > 0 && (
              <span className="tab-badge">{pendingRequestsCount}</span>
            )}
          </button>
        </div>
      ) : (
        <h2 className="certificates-title">{t("certificates")}</h2>
      )}

      {/* My Certificates Tab */}
      {activeTab === "my" && (
        <div className="tab-content">
          {/* My Pending Requests */}
          {myPending.length > 0 && (
            <section className="certificates-section">
              <h3 className="section-title">{t("myPendingRequests")}</h3>
              <ul className="certificate-list">
                {myPending.map((att) => (
                  <li key={att._id} className={`certificate-item pending ${att.certificate?.mandatory ? "mandatory" : ""}`}>
                    <Link to={`/certificates/${att.certificateId}`} className="certificate-link">
                      <div className="certificate-info">
                        <span className="certificate-name">
                          {getLocalized(att.certificate?.name)}
                          {att.certificate?.mandatory && <span className="mandatory-icon" title={t("mandatoryCertificate")}>⭐</span>}
                          {att.comment && <span className="comment-icon" title={t("hasComment")}>💬</span>}
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
          )}

          {/* My Certificates (Valid + Expired) */}
          <section className="certificates-section">
            <h3 className="section-title">{t("myCertificates")}</h3>
            {myValid.length === 0 && myExpired.length === 0 ? (
              <p className="empty-message">{t("noCertificates")}</p>
            ) : (
              <ul className="certificate-list">
                {myValid.map((att) => (
                  <li key={att._id} className={`certificate-item valid ${att.certificate?.mandatory ? "mandatory" : ""}`}>
                    <Link to={`/certificates/${att.certificateId}`} className="certificate-link">
                      <div className="certificate-info">
                        <span className="certificate-name">
                          {getLocalized(att.certificate?.name)}
                          {att.certificate?.mandatory && <span className="mandatory-icon" title={t("mandatoryCertificate")}>⭐</span>}
                          {att.comment && <span className="comment-icon" title={t("hasComment")}>💬</span>}
                        </span>
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
                {myExpired.map((att) => (
                  <li key={att._id} className={`certificate-item expired ${att.certificate?.mandatory ? "mandatory" : ""}`}>
                    <Link to={`/certificates/${att.certificateId}`} className="certificate-link">
                      <div className="certificate-info">
                        <span className="certificate-name">
                          {getLocalized(att.certificate?.name)}
                          {att.certificate?.mandatory && <span className="mandatory-icon" title={t("mandatoryCertificate")}>⭐</span>}
                          {att.comment && <span className="comment-icon" title={t("hasComment")}>💬</span>}
                        </span>
                        <span className="expired-badge">{t("expired")}</span>
                        <span className="validity-date">{formatDate(att.endDate)}</span>
                      </div>
                      <span className="link-arrow">&rarr;</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Available Certificates */}
          {availableCertificates.length > 0 && (
            <section className="certificates-section">
              <h3 className="section-title">{t("availableCertificates")}</h3>
              <ul className="certificate-list">
                {availableCertificates.map((cert) => (
                  <li key={cert._id} className={`certificate-item available ${cert.mandatory ? "mandatory" : ""}`}>
                    <Link to={`/certificates/${cert._id}`} className="certificate-link">
                      <div className="certificate-info">
                        <span className="certificate-name">
                          {getLocalized(cert.name)}
                          {cert.mandatory && <span className="mandatory-icon" title={t("mandatoryCertificate")}>⭐</span>}
                        </span>
                      </div>
                      <span className="link-arrow">&rarr;</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Requests Tab (Certifier View) */}
      {activeTab === "requests" && (
        <div className="tab-content">
          {/* Pending Requests to Confirm */}
          {pendingToConfirm.length > 0 ? (
            <section className="certificates-section">
              <h3 className="section-title">{t("requestsToConfirm")}</h3>
              <ul className="certificate-list">
                {pendingToConfirm.map((att) => (
                  <li key={att._id} className="certificate-item to-confirm">
                    <Link to={`/certifier-requests/${att._id}`} className="certificate-link">
                      <div className="certificate-info">
                        <span className="certificate-name">
                          {att.requesterName}
                          {att.comment && <span className="comment-icon" title={t("hasComment")}>💬</span>}
                        </span>
                        <span className="requester-certificate">
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
            <section className="certificates-section">
              <p className="empty-message">{t("noPendingRequests")}</p>
            </section>
          )}

          {/* Recently Confirmed */}
          {recentlyConfirmed.length > 0 && (
            <section className="certificates-section">
              <h3 className="section-title">{t("recentlyConfirmed")}</h3>
              <ul className="certificate-list">
                {recentlyConfirmed.map((att) => (
                  <li key={att._id} className="certificate-item confirmed">
                    <Link to={`/certifier-requests/${att._id}`} className="certificate-link">
                      <div className="certificate-info">
                        <span className="certificate-name">
                          {att.requesterName}
                          {att.comment && <span className="comment-icon" title={t("hasComment")}>💬</span>}
                        </span>
                        <span className="requester-certificate">
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
      )}
    </div>
  );
};

Certificates.propTypes = {
  loading: PropTypes.bool,
  certificates: PropTypes.array,
  myAttestations: PropTypes.array,
  isCertifier: PropTypes.bool,
  pendingToConfirm: PropTypes.array,
  recentlyConfirmed: PropTypes.array,
};

Certificates.defaultProps = {
  loading: false,
  certificates: [],
  myAttestations: [],
  isCertifier: false,
  pendingToConfirm: [],
  recentlyConfirmed: [],
};

export default Certificates;
