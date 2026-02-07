import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Tabs from "../../../components/Tabs";
import { getLocalized, formatDate } from "../utils";
import BackLink from "../components/BackLink";
import StatusBadge from "../components/StatusBadge";
import CertificateItem from "../components/CertificateItem";

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

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
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
    <MainContent>
      {/* Show tabs only for certifiers, otherwise just a heading */}
      {isCertifier ? (
        <Tabs
          tabs={[
            { key: "my", label: t("myCertificatesTab") },
            { key: "requests", label: t("requestsTab"), badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : (
        <h2 className="text-2xl mb-6 text-center">{t("certificates")}</h2>
      )}

      {/* My Certificates Tab */}
      {activeTab === "my" && (
        <div>
          {/* My Pending Requests */}
          {myPending.length > 0 && (
            <section className="mb-8">
              <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">{t("myPendingRequests")}</h3>
              <ul className="list-none p-0 m-0">
                {myPending.map((att) => (
                  <CertificateItem key={att._id} to={`/certificates/${att.certificateId}`} status="pending" mandatory={att.certificate?.mandatory}>
                    <span className="flex items-center font-semibold leading-snug">
                      {getLocalized(att.certificate?.name, lang)}
                      {att.certificate?.mandatory && <span className="inline-flex items-center ml-2 text-sm leading-none" title={t("mandatoryCertificate")}>⭐</span>}
                      {att.comment && <span className="inline-flex items-center ml-2 text-sm leading-none cursor-help" title={t("hasComment")}>💬</span>}
                    </span>
                    {att.attempt > 1 && (
                      <StatusBadge variant="attempt" small>
                        {t("attemptNumber", { number: att.attempt })}
                      </StatusBadge>
                    )}
                  </CertificateItem>
                ))}
              </ul>
            </section>
          )}

          {/* My Certificates (Valid + Expired) */}
          <section className="mb-8">
            <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">{t("myCertificates")}</h3>
            {myValid.length === 0 && myExpired.length === 0 ? (
              <p className="text-center text-gray-500 p-8 italic">{t("noCertificates")}</p>
            ) : (
              <ul className="list-none p-0 m-0">
                {myValid.map((att) => (
                  <CertificateItem key={att._id} to={`/certificates/${att.certificateId}`} status="valid" mandatory={att.certificate?.mandatory}>
                    <span className="flex items-center font-semibold leading-snug">
                      {getLocalized(att.certificate?.name, lang)}
                      {att.certificate?.mandatory && <span className="inline-flex items-center ml-2 text-sm leading-none" title={t("mandatoryCertificate")}>⭐</span>}
                      {att.comment && <span className="inline-flex items-center ml-2 text-sm leading-none cursor-help" title={t("hasComment")}>💬</span>}
                    </span>
                    {att.endDate && (
                      <span className="block text-xs text-gray-500">
                        {t("validUntil")}: {formatDate(att.endDate, lang)}
                      </span>
                    )}
                  </CertificateItem>
                ))}
                {myExpired.map((att) => (
                  <CertificateItem key={att._id} to={`/certificates/${att.certificateId}`} status="expired" mandatory={att.certificate?.mandatory}>
                    <span className="flex items-center font-semibold leading-snug">
                      {getLocalized(att.certificate?.name, lang)}
                      {att.certificate?.mandatory && <span className="inline-flex items-center ml-2 text-sm leading-none" title={t("mandatoryCertificate")}>⭐</span>}
                      {att.comment && <span className="inline-flex items-center ml-2 text-sm leading-none cursor-help" title={t("hasComment")}>💬</span>}
                    </span>
                    <StatusBadge variant="expired" small>{t("expired")}</StatusBadge>
                    <span className="block text-xs text-gray-500">{formatDate(att.endDate, lang)}</span>
                  </CertificateItem>
                ))}
              </ul>
            )}
          </section>

          {/* Available Certificates */}
          {availableCertificates.length > 0 && (
            <section className="mb-8">
              <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">{t("availableCertificates")}</h3>
              <ul className="list-none p-0 m-0">
                {availableCertificates.map((cert) => (
                  <CertificateItem key={cert._id} to={`/certificates/${cert._id}`} status="available" mandatory={cert.mandatory}>
                    <span className="flex items-center font-semibold leading-snug">
                      {getLocalized(cert.name, lang)}
                      {cert.mandatory && <span className="inline-flex items-center ml-2 text-sm leading-none" title={t("mandatoryCertificate")}>⭐</span>}
                    </span>
                  </CertificateItem>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Requests Tab (Certifier View) */}
      {activeTab === "requests" && (
        <div>
          {/* Pending Requests to Confirm */}
          {pendingToConfirm.length > 0 ? (
            <section className="mb-8">
              <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">{t("requestsToConfirm")}</h3>
              <ul className="list-none p-0 m-0">
                {pendingToConfirm.map((att) => (
                  <CertificateItem key={att._id} to={`/certifier-requests/${att._id}`} status="to-confirm">
                    <span className="flex items-center font-semibold leading-snug">
                      {att.requesterName}
                      {att.comment && <span className="inline-flex items-center ml-2 text-sm leading-none cursor-help" title={t("hasComment")}>💬</span>}
                    </span>
                    <span className="block text-sm text-gray-500 mt-0.5">
                      {getLocalized(att.certificate?.name, lang)}
                    </span>
                    {att.attempt > 1 && (
                      <StatusBadge variant="attempt" small>
                        {t("attemptNumber", { number: att.attempt })}
                      </StatusBadge>
                    )}
                  </CertificateItem>
                ))}
              </ul>
            </section>
          ) : (
            <section className="mb-8">
              <p className="text-center text-gray-500 p-8 italic">{t("noPendingRequests")}</p>
            </section>
          )}

          {/* Recently Confirmed */}
          {recentlyConfirmed.length > 0 && (
            <section className="mb-8">
              <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">{t("recentlyConfirmed")}</h3>
              <ul className="list-none p-0 m-0">
                {recentlyConfirmed.map((att) => (
                  <CertificateItem key={att._id} to={`/certifier-requests/${att._id}`} status="confirmed">
                    <span className="flex items-center font-semibold leading-snug">
                      {att.requesterName}
                      {att.comment && <span className="inline-flex items-center ml-2 text-sm leading-none cursor-help" title={t("hasComment")}>💬</span>}
                    </span>
                    <span className="block text-sm text-gray-500 mt-0.5">
                      {getLocalized(att.certificate?.name, lang)}
                    </span>
                    <StatusBadge variant="confirmed" small>{t("confirmed")}</StatusBadge>
                    {att.endDate && (
                      <span className="block text-xs text-gray-500">
                        {t("validUntil")}: {formatDate(att.endDate, lang)}
                      </span>
                    )}
                  </CertificateItem>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </MainContent>
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
