import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import MainContent from "/imports/components/MainContent";

/**
 * Pure notification settings component.
 * @param {Object} props
 * @param {Object} props.prefs - Notification preferences { membershipExpiry: bool, testNotification: bool }
 * @param {boolean} props.loading - Loading state
 * @param {string} props.pushPermission - Browser push permission ("granted"|"denied"|"default")
 * @param {boolean} props.isAdmin - Whether the current user is an admin
 * @param {function} props.onToggle - Callback when a pref toggle is clicked, receives the pref key
 * @param {function} props.onSendTest - Callback to send a test notification
 * @param {function} props.onRequestPermission - Callback to request push notification permission
 */
const NotificationSettings = ({
  prefs = { membershipExpiry: true },
  loading = false,
  pushPermission = "default",
  isAdmin = false,
  onToggle,
  onSendTest,
  onRequestPermission,
}) => {
  const { t } = useTranslation();
  const disabled = pushPermission !== "granted";

  if (loading) {
    return <div className="p-4 text-center text-gray-500">{t("loading")}</div>;
  }

  return (
    <MainContent>
      <div className="space-y-4">
        {/* Push permission status */}
        {pushPermission === "unsupported" ? (
          <div className="bg-amber-50 rounded-lg border border-amber-300 p-4">
            <p className="text-sm text-amber-800 mb-3">{t("pushPermissionUnsupported")}</p>
            <Link
              to="/install"
              className="block w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium text-center no-underline"
            >
              {t("pushPermissionInstall")}
            </Link>
          </div>
        ) : pushPermission === "granted" ? (
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="text-sm text-green-700">{t("pushPermissionGranted")}</p>
          </div>
        ) : pushPermission === "denied" ? (
          <div className="bg-amber-50 rounded-lg border border-amber-300 p-4">
            <p className="text-sm font-medium text-amber-800">{t("pushPermissionDenied")}</p>
            <p className="text-sm text-amber-700 mt-2">{t("pushPermissionDeniedInstructions")}</p>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-lg border border-amber-300 p-4">
            <p className="text-sm text-amber-800 mb-3">{t("pushPermissionDefault")}</p>
            <button
              onClick={onRequestPermission}
              className="w-full py-2 px-4 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
            >
              {t("pushPermissionAllow")}
            </button>
          </div>
        )}

        {/* Membership expiry toggle */}
        <div className={`bg-white rounded-lg border border-gray-200 p-4 flex justify-between items-center${disabled ? " opacity-50" : ""}`}>
          <span className="text-sm font-medium">{t("membershipExpiryNotif")}</span>
          <button
            disabled={disabled}
            onClick={() => onToggle("membershipExpiry")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prefs.membershipExpiry ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                prefs.membershipExpiry ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Test notification toggle + send button (admin only) */}
        {isAdmin && (
          <>
            <div className={`bg-white rounded-lg border border-gray-200 p-4 flex justify-between items-center${disabled ? " opacity-50" : ""}`}>
              <span className="text-sm font-medium">{t("testNotificationNotif")}</span>
              <button
                disabled={disabled}
                onClick={() => onToggle("testNotification")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  prefs.testNotification ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    prefs.testNotification ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {prefs.testNotification && (
              <button
                disabled={disabled}
                onClick={onSendTest}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium disabled:opacity-50"
              >
                {t("testNotifTitle")}
              </button>
            )}
          </>
        )}
      </div>
    </MainContent>
  );
};

export default NotificationSettings;
