import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Button from "../../../components/Button";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Markdown from "../../../components/Markdown";
import { getLocalized, formatDate, formatDateTime } from "../utils";
import BackLink from "../components/BackLink";
import StatusBadge from "../components/StatusBadge";

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
        <p className="text-red-600 text-center p-8">{error}</p>
        <BackLink>{t("backToCertificates")}</BackLink>
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
      <BackLink>{t("backToCertificates")}</BackLink>

      {/* Certificate Info */}
      <section className="mb-8 pb-4 border-b-2 border-gray-200">
        <h2 className="text-2xl mb-3 text-gray-800">{getLocalized(certificate.name, lang)}</h2>
        {certificate.description && (
          <Markdown className="text-gray-600 leading-relaxed mb-3">
            {getLocalized(certificate.description, lang)}
          </Markdown>
        )}
        {certificate.defaultValidityDays && (
          <p className="text-sm text-gray-500">
            {t("validityPeriod")}: {certificate.defaultValidityDays} {t("daysUnit")}
          </p>
        )}
      </section>

      {/* Mandatory Certificate Notice */}
      {certificate.mandatory && (
        <div className="flex justify-between items-center py-3 px-4 mb-6 bg-yellow-50 border border-yellow-300 rounded-lg">
          <span className="text-sm font-medium text-yellow-800">{t("mandatoryCertificateNotice")}</span>
          <span className="text-xl">⭐</span>
        </div>
      )}

      {/* My Status */}
      <section className="mb-8">
        <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">{t("myStatus")}</h3>

        {isValid && (
          <div className="p-4 rounded-lg border border-gray-200 border-l-4 border-l-[#5fc86f] bg-green-50">
            <StatusBadge variant="valid">{t("certified")}</StatusBadge>
            <div className="mt-3">
              {myAttestation.certifierName && (
                <p className="my-1 text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">{t("certifiedBy")}:</span> {myAttestation.certifierName}
                </p>
              )}
              <p className="my-1 text-sm text-gray-600">
                <span className="font-semibold text-gray-700">{t("certifiedOn")}:</span> {formatDate(myAttestation.confirmedAt || myAttestation.startDate, lang)}
              </p>
              {myAttestation.endDate ? (
                <p className="my-1 text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">{t("validUntil")}:</span> {formatDate(myAttestation.endDate, lang)}
                </p>
              ) : (
                <p className="my-1 text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">{t("validUntil")}:</span> {t("noExpiration")}
                </p>
              )}
            </div>
            {myAttestation.comment && (
              <div className="mt-4 py-3 px-4 bg-sky-50 border border-sky-200 border-l-4 border-l-sky-500 rounded-md">
                <span className="block text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">{t("certifierComment")}</span>
                <p className="m-0 text-sm text-[#1e3a5f] leading-relaxed">{myAttestation.comment}</p>
              </div>
            )}
          </div>
        )}

        {isExpired && (
          <div className="p-4 rounded-lg border border-gray-200 border-l-4 border-l-gray-400 bg-gray-50">
            <StatusBadge variant="expired">{t("expired")}</StatusBadge>
            <div className="mt-3">
              {myAttestation.certifierName && (
                <p className="my-1 text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">{t("certifiedBy")}:</span> {myAttestation.certifierName}
                </p>
              )}
              <p className="my-1 text-sm text-gray-600">
                <span className="font-semibold text-gray-700">{t("certifiedOn")}:</span> {formatDate(myAttestation.confirmedAt || myAttestation.startDate, lang)}
              </p>
              <p className="my-1 text-sm text-gray-600">
                <span className="font-semibold text-gray-700">{t("expiredOn")}:</span> {formatDate(myAttestation.endDate, lang)}
              </p>
            </div>
            {myAttestation.comment && (
              <div className="mt-4 py-3 px-4 bg-sky-50 border border-sky-200 border-l-4 border-l-sky-500 rounded-md">
                <span className="block text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">{t("certifierComment")}</span>
                <p className="m-0 text-sm text-[#1e3a5f] leading-relaxed">{myAttestation.comment}</p>
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
          <div className="p-4 rounded-lg border border-gray-200 border-l-4 border-l-amber-500 bg-amber-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center flex-wrap gap-2">
                <StatusBadge variant="pending">{t("pendingRequest")}</StatusBadge>
                {myAttestation.attempt > 1 && (
                  <StatusBadge variant="attempt" small>
                    {t("attemptNumber", { number: myAttestation.attempt })}
                  </StatusBadge>
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
            <p className="mt-2 mb-0 text-sm text-amber-800">
              {t("requestedAt")}: {formatDateTime(myAttestation.startDate, lang)}
            </p>
            {myAttestation.comment ? (
              <div className="mt-4 py-3 px-4 bg-amber-100 border border-amber-300 border-l-4 border-l-amber-500 rounded-md">
                <span className="block text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">{t("certifierFeedback")}</span>
                <p className="m-0 text-sm text-amber-900 leading-relaxed">{myAttestation.comment}</p>
              </div>
            ) : (
              <p className="mt-3 mb-0 p-3 text-sm text-amber-900 bg-white/50 rounded-md leading-relaxed">
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
          <div className="p-4 rounded-lg border border-gray-200 border-l-4 border-l-blue-500 bg-blue-50">
            <p className="mb-4">{t("canRequestCertificate")}</p>
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
