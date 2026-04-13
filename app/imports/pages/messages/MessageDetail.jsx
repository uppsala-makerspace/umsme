import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import Markdown from "../../components/Markdown";

const formatDate = (date, language) => {
  const locale = language === "sv" ? "sv-SE" : "en-US";
  return new Date(date).toLocaleDateString(locale);
};

const URL_REGEX = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)])/g;

const linkify = (text) => {
  if (!text) return text;
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-brand-green underline">
          {part}
        </a>
      );
    }
    return part;
  });
};

const MessageDetail = ({ loading, kind, item }) => {
  const { t, i18n } = useTranslation();

  if (loading) {
    return <MainContent><Loader /></MainContent>;
  }

  if (!item) {
    return (
      <MainContent>
        <Link to="/messages" className="text-sm text-gray-600 no-underline">&larr; {t("back")}</Link>
        <p className="text-center text-gray-600 mt-5">{t("noMessages")}</p>
      </MainContent>
    );
  }

  const isMessage = kind === "message";
  const lang = i18n.language === "en" ? "en" : "sv";
  const subject = isMessage
    ? item.subject
    : (lang === "en" ? (item.subjectEn || item.subjectSv) : (item.subjectSv || item.subjectEn));
  const body = isMessage
    ? null
    : (lang === "en" ? (item.bodyEn || item.bodySv) : (item.bodySv || item.bodyEn));
  const date = isMessage ? item.senddate : item.sentAt;
  const tagLabel = isMessage
    ? t("tagPrivate")
    : item.type === "newsletter" ? t("tagNewsletter") : t("tagInformation");
  const tagClass = isMessage
    ? "bg-blue-100 text-blue-700"
    : item.type === "newsletter" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700";

  return (
    <MainContent>
      <Link to="/messages" className="text-sm text-gray-600 no-underline">&larr; {t("back")}</Link>
      <h1 className="mt-3 mb-2 text-2xl font-bold">{subject}</h1>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs px-2 py-0.5 rounded ${tagClass}`}>{tagLabel}</span>
        <span className="text-xs text-gray-500">{formatDate(date, i18n.language)}</span>
      </div>

      {isMessage ? (
        <div className="whitespace-pre-wrap">{linkify(item.messagetext)}</div>
      ) : (
        body && <Markdown startLevel={2}>{body}</Markdown>
      )}
    </MainContent>
  );
};

MessageDetail.propTypes = {
  loading: PropTypes.bool,
  kind: PropTypes.oneOf(["message", "announcement"]).isRequired,
  item: PropTypes.object,
};

export default MessageDetail;
