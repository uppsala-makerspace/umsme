import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import Tabs from "../../components/Tabs/Tabs";

const formatDate = (date, language) => {
  const locale = language === "sv" ? "sv-SE" : "en-US";
  return new Date(date).toLocaleDateString(locale);
};

const getTagLabel = (item, t) => {
  if (item.kind === "message") return t("tagPrivate");
  if (item.type === "newsletter") return t("tagNewsletter");
  if (item.type === "information") return t("tagInformation");
  return item.type || "";
};

const getTagClass = (item) => {
  if (item.kind === "message") return "bg-blue-100 text-blue-700";
  if (item.type === "newsletter") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
};

const Messages = ({ loading, items, lastSeen }) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("announcements");

  const announcementCount = useMemo(
    () => items.filter((i) => i.kind === "announcement").length,
    [items]
  );
  const messageCount = useMemo(
    () => items.filter((i) => i.kind === "message").length,
    [items]
  );

  const visibleItems = useMemo(
    () => items.filter((item) =>
      activeTab === "announcements" ? item.kind === "announcement" : item.kind === "message"
    ),
    [items, activeTab]
  );

  if (loading) {
    return <MainContent><Loader /></MainContent>;
  }

  return (
    <MainContent>
      <Tabs
        tabs={[
          { key: "announcements", label: `${t("tagAnnouncements")} (${announcementCount})` },
          { key: "messages", label: `${t("tagPrivateMessages")} (${messageCount})` },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {visibleItems.length === 0 ? (
        <p className="text-center text-gray-600 mt-5">{t("noMessages")}</p>
      ) : (
        <ul className="list-none p-0 flex flex-col gap-2 mt-4">
          {visibleItems.map((item) => {
            const isNew = !lastSeen || new Date(item.date) > lastSeen;
            return (
              <li key={`${item.kind}-${item._id}`}>
                <Link
                  to={`/messages/${item.kind}/${item._id}`}
                  className="block no-underline text-inherit p-3 rounded border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isNew && (
                      <span className="inline-block w-2 h-2 rounded-full bg-brand-green flex-shrink-0" aria-label={t("newIndicator")}></span>
                    )}
                    <span className="font-medium">{item.subject}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getTagClass(item)}`}>
                      {getTagLabel(item, t)}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(item.date, i18n.language)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </MainContent>
  );
};

Messages.propTypes = {
  loading: PropTypes.bool,
  items: PropTypes.array.isRequired,
  lastSeen: PropTypes.instanceOf(Date),
};

export default Messages;
