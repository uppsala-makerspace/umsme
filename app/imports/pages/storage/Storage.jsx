import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";

const STORAGE_LOCATION_OPTIONS = [
  { value: "floor1", key: "storageFloor1Anywhere" },
  { value: "floor2", key: "storageFloor2Anywhere" },
  { value: "floor1L", key: "storageFloor1Bottom" },
  { value: "floor2L", key: "storageFloor2Bottom" },
  { value: "floor1U", key: "storageFloor1Upper" },
  { value: "floor2U", key: "storageFloor2Upper" },
];

const STORAGE_REQUEST_OPTIONS = [
  ...STORAGE_LOCATION_OPTIONS,
  { value: "none", key: "storageNoBoxNeeded" },
];

/**
 * Pure Storage component for displaying and managing storage box information.
 * @param {Object} props
 * @param {string|number|null} props.storage - The assigned storage box number
 * @param {boolean|null} props.storagequeue - Whether the user is in the queue
 * @param {string|null} props.storagerequest - Current storage request value
 * @param {boolean} props.hasLabMembership - Whether the user has an active lab membership
 * @param {boolean} props.loading - Loading state
 * @param {boolean} [props.readOnly] - Whether to show read-only view (family members)
 * @param {function} [props.onQueueForBox] - Callback when user wants to queue for a box
 * @param {function} [props.onSubmitRequest] - Callback when user submits a storage request
 * @param {function} [props.onCancelQueue] - Callback when user wants to cancel queue
 */
const Storage = ({
  storage,
  storagequeue,
  storagerequest,
  hasLabMembership,
  loading,
  readOnly,
  onQueueForBox,
  onSubmitRequest,
  onCancelQueue,
}) => {
  const { t } = useTranslation();
  const [selectedRequest, setSelectedRequest] = useState(storagerequest || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRequest = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitRequest(selectedRequest || null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQueueForBox = async () => {
    setIsSubmitting(true);
    try {
      await onQueueForBox();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelQueue = async () => {
    setIsSubmitting(true);
    try {
      await onCancelQueue();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (!hasLabMembership) {
    return (
      <MainContent className="items-center justify-center pt-8">
        <p className="text-gray-600 text-center">{t("storageRequiresLab")}</p>
      </MainContent>
    );
  }

  // User has a storage box
  if (storage) {
    return (
      <MainContent className="items-center pt-8 gap-6">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-1">{t("myBoxNumber")}</p>
          <p className="text-3xl font-bold text-green-600">{storage}</p>
        </div>

        {readOnly ? (
          <p className="text-sm text-gray-500 text-center">{t("storageFamilyReadOnly")}</p>
        ) : (
          <div className="w-full">
            <h3 className="text-lg font-medium mb-2">{t("requestBoxChange")}</h3>
            <p className="text-sm text-gray-600 mb-3">{t("requestBoxChangeInfo")}</p>
            <select
              className="select-chevron appearance-none pr-10 w-full py-2.5 px-3 text-base font-mono bg-surface border border-black rounded box-border focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
              value={selectedRequest}
              onChange={(e) => setSelectedRequest(e.target.value)}
            >
              <option value="">{t("selectPreference")}</option>
              {STORAGE_REQUEST_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key)}
                </option>
              ))}
            </select>
            <Button
              className="mt-3"
              fullWidth
              onClick={handleSubmitRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("loading") : t("submitRequest")}
            </Button>
            {storagerequest && (
              <p className="mt-2 text-sm text-green-600 text-center">
                {t("currentRequest")}: {t(STORAGE_REQUEST_OPTIONS.find(o => o.value === storagerequest)?.key || storagerequest)}
              </p>
            )}
          </div>
        )}
      </MainContent>
    );
  }

  // User is in queue for a box
  if (storagequeue) {
    return (
      <MainContent className="items-center pt-8 gap-2">
        <div className="text-center">
          <p className="text-gray-600">{t("inQueueForBox")}</p>
        </div>

        {!readOnly && (
          <>
            <button
              className="text-red-500 hover:text-red-600 text-sm"
              onClick={handleCancelQueue}
              disabled={isSubmitting}
            >
              {t("cancelQueue")}
            </button>

            <div className="w-full">
              <h3 className="text-lg font-medium mb-2">{t("boxPreference")}</h3>
              <p className="text-sm text-gray-600 mb-3">{t("boxPreferenceInfo")}</p>
              <select
                className="select-chevron appearance-none pr-10 w-full py-2.5 px-3 text-base font-mono bg-surface border border-black rounded box-border focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                value={selectedRequest}
                onChange={(e) => setSelectedRequest(e.target.value)}
              >
                <option value="">{t("selectPreference")}</option>
                {STORAGE_LOCATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.key)}
                  </option>
                ))}
              </select>
              <Button
                className="mt-3"
                fullWidth
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
              >
                {isSubmitting ? t("loading") : t("submitRequest")}
              </Button>
              {storagerequest && (
                <p className="mt-2 text-sm text-green-600 text-center">
                  {t("currentRequest")}: {t(STORAGE_LOCATION_OPTIONS.find(o => o.value === storagerequest)?.key || storagerequest)}
                </p>
              )}
            </div>
          </>
        )}
      </MainContent>
    );
  }

  // User has no box and is not in queue
  return (
    <MainContent className="items-center pt-8 gap-6">
      <div className="text-center">
        <p className="text-gray-600">{t("noBoxAssigned")}</p>
      </div>

      {readOnly ? (
        <p className="text-sm text-gray-500 text-center">{t("storageFamilyReadOnly")}</p>
      ) : (
        <div className="w-full text-center">
          <p className="text-sm text-gray-600 mb-4">{t("queueForBoxInfo")}</p>
          <Button
            fullWidth
            onClick={handleQueueForBox}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("loading") : t("queueForBox")}
          </Button>
        </div>
      )}
    </MainContent>
  );
};

export default Storage;
