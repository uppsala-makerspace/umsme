import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "/imports/components/MainContent";

const timeAgo = (timestamp, t) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "< 1 min";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days} ${t("daysUnit")}`;
};

const resolve = (value, lang) => {
  if (typeof value === "object" && value !== null) {
    return value[lang] || value.sv || value.en || "";
  }
  return value || "";
};

/**
 * Pure notification list component.
 * @param {Object} props
 * @param {Array<{id: number, title: string|{sv:string,en:string}, body: string|{sv:string,en:string}, timestamp: number}>} props.notifications
 * @param {function} props.onClearAll - Callback to clear all notifications
 */
const NotificationsList = ({
  notifications = [],
  onClearAll,
  highlightIds = new Set(),
  freshIds = new Set(),
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const cardClasses = (id) => {
    if (freshIds.has(id)) {
      return "bg-blue-100 border-l-4 border-l-blue-500 border border-gray-200 transition-colors duration-700";
    }
    if (highlightIds.has(id)) {
      return "bg-blue-50 border-l-4 border-l-blue-300 border border-gray-200 transition-colors duration-700";
    }
    return "bg-white border border-gray-200";
  };

  return (
    <MainContent>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-sm text-red-600 hover:text-red-800"
            >
              {t("clearAll")}
            </button>
          )}
        </div>
        <Link to="/notification-settings" className="text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>

      {notifications.length === 0 ? (
        <p className="text-center text-gray-500 mt-8">{t("noNotifications")}</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className={`rounded-lg p-4 shadow-sm ${cardClasses(n.id)}`}>
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-sm">{resolve(n.title, lang)}</h3>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                  {timeAgo(n.timestamp, t)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{resolve(n.body, lang)}</p>
            </div>
          ))}
        </div>
      )}
    </MainContent>
  );
};

export default NotificationsList;
