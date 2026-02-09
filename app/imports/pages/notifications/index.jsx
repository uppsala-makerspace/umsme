import { Meteor } from "meteor/meteor";
import React, { useState, useEffect, useContext, useRef } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import NotificationsList from "./NotificationsList";
import { getAll, markAllAsRead, clearAll } from "/imports/lib/notificationStore";
import { NotificationContext } from "/imports/context/NotificationContext";

export default () => {
  const { refreshUnreadCount } = useContext(NotificationContext);
  const [notifications, setNotifications] = useState([]);
  const [highlightIds, setHighlightIds] = useState(new Set());
  const [freshIds, setFreshIds] = useState(new Set());
  const fadeTimeout = useRef(null);
  const knownIdsRef = useRef(new Set());

  const scheduleFade = (ids) => {
    if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    fadeTimeout.current = setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, 3000);
  };

  useEffect(() => {
    const loadInitial = async () => {
      const items = await getAll();
      setNotifications(items);
      knownIdsRef.current = new Set(items.map((n) => n.id));

      const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        const idSet = new Set(unreadIds);
        setHighlightIds(idSet);
        setFreshIds(idSet);
        scheduleFade(unreadIds);
      }

      await markAllAsRead();
      refreshUnreadCount();
    };

    loadInitial();

    let channel;
    try {
      channel = new BroadcastChannel("notifications");
      channel.onmessage = async (event) => {
        if (event.data?.type === "NEW_NOTIFICATION") {
          const items = await getAll();
          const newIds = items
            .filter((n) => !knownIdsRef.current.has(n.id))
            .map((n) => n.id);

          knownIdsRef.current = new Set(items.map((n) => n.id));
          setNotifications(items);

          if (newIds.length > 0) {
            setHighlightIds((prev) => {
              const next = new Set(prev);
              newIds.forEach((id) => next.add(id));
              return next;
            });
            setFreshIds((prev) => {
              const next = new Set(prev);
              newIds.forEach((id) => next.add(id));
              return next;
            });
            scheduleFade(newIds);
          }

          await markAllAsRead();
          refreshUnreadCount();
        }
      };
    } catch (e) {
      // BroadcastChannel may not be supported
    }

    return () => {
      if (channel) channel.close();
      if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    };
  }, []);

  const handleClearAll = async () => {
    await clearAll();
    setNotifications([]);
    setHighlightIds(new Set());
    setFreshIds(new Set());
    refreshUnreadCount();
  };

  return (
    <Layout>
      {!Meteor.userId() ? <Navigate to="/login" /> : null}
      <NotificationsList
        notifications={notifications}
        onClearAll={handleClearAll}
        highlightIds={highlightIds}
        freshIds={freshIds}
      />
    </Layout>
  );
};
