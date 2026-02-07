import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";
import "./storage-page.css";

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
 * @param {function} props.onQueueForBox - Callback when user wants to queue for a box
 * @param {function} props.onSubmitRequest - Callback when user submits a storage request
 * @param {function} props.onCancelQueue - Callback when user wants to cancel queue
 */
const Storage = ({
  storage,
  storagequeue,
  storagerequest,
  hasLabMembership,
  loading,
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
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-gray-600">{t("loading")}</p>
      </div>
    );
  }

  if (!hasLabMembership) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-gray-600 text-center">{t("storageRequiresLab")}</p>
      </div>
    );
  }

  // User has a storage box
  if (storage) {
    return (
      <div className="flex flex-col items-center p-8 gap-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("myBox")}</h2>
          <p className="text-lg text-gray-600 mb-1">{t("myBoxNumber")}</p>
          <p className="text-3xl font-bold text-green-600">{storage}</p>
        </div>

        <div className="w-full max-w-xl">
          <h3 className="text-lg font-medium mb-2">{t("requestBoxChange")}</h3>
          <p className="text-sm text-gray-600 mb-3">{t("requestBoxChangeInfo")}</p>
          <select
            className="storage-select w-full p-3 border border-gray-300 rounded-lg bg-white"
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
      </div>
    );
  }

  // User is in queue for a box
  if (storagequeue) {
    return (
      <div className="flex flex-col items-center p-8 gap-2">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("myBox")}</h2>
          <p className="text-gray-600">{t("inQueueForBox")}</p>
        </div>

        <button
          className="text-red-500 hover:text-red-600 text-sm"
          onClick={handleCancelQueue}
          disabled={isSubmitting}
        >
          {t("cancelQueue")}
        </button>

        <div className="w-full max-w-xl">
          <h3 className="text-lg font-medium mb-2">{t("boxPreference")}</h3>
          <p className="text-sm text-gray-600 mb-3">{t("boxPreferenceInfo")}</p>
          <select
            className="storage-select w-full p-3 border border-gray-300 rounded-lg bg-white"
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
      </div>
    );
  }

  // User has no box and is not in queue
  return (
    <div className="flex flex-col items-center p-8 gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">{t("myBox")}</h2>
        <p className="text-gray-600">{t("noBoxAssigned")}</p>
      </div>

      <div className="w-full max-w-xl text-center">
        <p className="text-sm text-gray-600 mb-4">{t("queueForBoxInfo")}</p>
        <Button
          fullWidth
          onClick={handleQueueForBox}
          disabled={isSubmitting}
        >
          {isSubmitting ? t("loading") : t("queueForBox")}
        </Button>
      </div>
    </div>
  );
};

export default Storage;
