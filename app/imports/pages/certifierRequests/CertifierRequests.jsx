import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";

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
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  return (
    <MainContent>
      <Link to="/certificates" className="inline-block text-[#5fc86f] no-underline mb-4 text-sm hover:underline">
        &larr; {t("backToCertificates")}
      </Link>

      <h2 className="text-2xl mb-6 text-center">{t("confirmRequestsTab")}</h2>

      {/* Pending Requests */}
      {pendingRequests.length > 0 ? (
        <section className="mb-8">
          <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">{t("requestsToConfirm")}</h3>
          <ul className="list-none p-0 m-0">
            {pendingRequests.map((att) => (
              <li key={att._id} className="mb-3 rounded-lg bg-white border border-gray-200 border-l-4 border-l-violet-500">
                <Link to={`/certifier-requests/${att._id}`} className="flex justify-between items-center p-4 no-underline text-inherit transition-colors hover:bg-gray-50">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-gray-900">{att.requesterName}</span>
                    <span className="text-sm text-gray-500">
                      {getLocalized(att.certificate?.name)}
                    </span>
                    {att.attempt > 1 && (
                      <span className="inline-block text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ml-2">
                        {t("attemptNumber", { number: att.attempt })}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-xl ml-2">&rarr;</span>
                </Link>
              </li>
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
              <li key={att._id} className="mb-3 rounded-lg border border-gray-200 border-l-4 border-l-[#5fc86f] bg-green-50">
                <Link to={`/certifier-requests/${att._id}`} className="flex justify-between items-center p-4 no-underline text-inherit transition-colors hover:bg-green-100">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-gray-900">{att.requesterName}</span>
                    <span className="text-sm text-gray-500">
                      {getLocalized(att.certificate?.name)}
                    </span>
                    <span className="inline-block text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{t("confirmed")}</span>
                    {att.endDate && (
                      <span className="inline-block text-xs text-gray-500 ml-3">
                        {t("validUntil")}: {formatDate(att.endDate)}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-xl ml-2">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </MainContent>
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
