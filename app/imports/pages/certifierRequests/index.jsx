import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import TopBar from "/imports/components/TopBar";
import CertifierRequests from "./CertifierRequests.jsx";

export default () => {
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [recentlyConfirmed, setRecentlyConfirmed] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await Meteor.callAsync("certificates.getPendingToConfirm");
      // Separate pending from recently confirmed
      const pending = data.filter((att) => !att.isConfirmed);
      const confirmed = data
        .filter((att) => att.isConfirmed)
        .sort((a, b) => new Date(b.confirmedAt) - new Date(a.confirmedAt));
      setPendingRequests(pending);
      setRecentlyConfirmed(confirmed);
    } catch (error) {
      console.error("Error fetching certifier data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <TopBar />
      <CertifierRequests
        loading={loading}
        pendingRequests={pendingRequests}
        recentlyConfirmed={recentlyConfirmed}
      />
    </>
  );
};
