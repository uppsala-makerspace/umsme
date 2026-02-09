import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { subscribeToPush } from "/imports/hooks/pushSetupHook";
import NotificationSettings from "./NotificationSettings";

export default () => {
  const [prefs, setPrefs] = useState({ membershipExpiry: true });
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState("default");
  const [isAdmin, setIsAdmin] = useState(false);

  // Listen for permission changes (Permissions API + custom event fallback)
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPushPermission(Notification.permission);
    }

    const onGranted = () => setPushPermission("granted");
    window.addEventListener("push-permission-granted", onGranted);

    let status;
    const onPermissionChange = () => setPushPermission(status.state);
    if (navigator.permissions) {
      navigator.permissions.query({ name: "notifications" }).then((s) => {
        status = s;
        onPermissionChange();
        status.addEventListener("change", onPermissionChange);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener("push-permission-granted", onGranted);
      status?.removeEventListener("change", onPermissionChange);
    };
  }, []);

  // Sequential calls to avoid a race condition where parallel Meteor.callAsync
  // calls can arrive at the server before the DDP login is established.
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const result = await Meteor.callAsync("getNotificationPrefs");
        setPrefs(result);
        const admin = await Meteor.callAsync("checkIsAdmin");
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

  const handleRequestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === "granted") {
        await subscribeToPush();
      }
    } catch (e) {
      console.error("Error requesting permission:", e);
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
        onRequestPermission={handleRequestPermission}
      />
    </Layout>
  );
};
