import React, { useContext, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import Messages from "./Messages";
import { MessagesContext } from "/imports/context/MessagesContext";

export default () => {
  const { messages, announcements, loading, lastSeen, markAsSeen } = useContext(MessagesContext);
  const { i18n } = useTranslation();

  useEffect(() => {
    markAsSeen();
  }, [markAsSeen]);

  const items = useMemo(() => {
    const lang = i18n.language === "sv" ? "sv" : "en";
    const combined = [
      ...messages.map((m) => ({
        kind: "message",
        _id: m._id,
        subject: m.subject,
        date: m.senddate,
        type: m.type,
      })),
      ...announcements.map((a) => ({
        kind: "announcement",
        _id: a._id,
        subject: lang === "en" && a.subjectEn ? a.subjectEn : a.subjectSv,
        date: a.sentAt,
        type: a.type,
      })),
    ];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    return combined;
  }, [messages, announcements, i18n.language]);

  if (!Meteor.userId()) return <Navigate to="/login" />;

  return (
    <Layout>
      <Messages loading={loading} items={items} lastSeen={lastSeen} />
    </Layout>
  );
};
