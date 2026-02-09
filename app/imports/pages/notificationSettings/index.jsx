import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import NotificationSettings from "./NotificationSettings";

export default () => {
  const [prefs, setPrefs] = useState({ membershipExpiry: true });
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState("default");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPushPermission(Notification.permission);
    }

    const fetchPrefs = async () => {
      try {
        const [result, admin] = await Promise.all([
          Meteor.callAsync("getNotificationPrefs"),
          Meteor.callAsync("checkIsAdmin"),
        ]);
        setPrefs(result);
        setIsAdmin(admin);
      } catch (e) {
        console.error("Error fetching prefs:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleToggle = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await Meteor.callAsync("updateNotificationPrefs", updated);
    } catch (e) {
      console.error("Error updating prefs:", e);
      setPrefs(prefs);
    }
  };

  const handleSendTest = async () => {
    try {
      await Meteor.callAsync("sendTestNotification");
    } catch (e) {
      console.error("Error sending test:", e);
    }
  };

  return (
    <Layout>
      {!Meteor.userId() ? <Navigate to="/login" /> : null}
      <NotificationSettings
        prefs={prefs}
        loading={loading}
        pushPermission={pushPermission}
        isAdmin={isAdmin}
        onToggle={handleToggle}
        onSendTest={handleSendTest}
      />
    </Layout>
  );
};
