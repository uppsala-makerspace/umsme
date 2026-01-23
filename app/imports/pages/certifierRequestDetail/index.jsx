import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import CertifierRequestDetail from "./CertifierRequestDetail.jsx";

export default () => {
  const user = useTracker(() => Meteor.user());
  const { attestationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await Meteor.callAsync("certificates.getRequestDetail", attestationId);
      setData(result);
    } catch (err) {
      console.error("Error fetching request detail:", err);
      setError(err.reason || err.message || "Error loading request");
    } finally {
      setLoading(false);
    }
  }, [attestationId]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  const handleConfirm = async (comment, privateComment) => {
    try {
      await Meteor.callAsync(
        "certificates.confirm",
        attestationId,
        comment || undefined,
        privateComment || undefined
      );
      navigate("/certificates", { state: { tab: "requests" } });
    } catch (err) {
      console.error("Error confirming:", err);
      throw err;
    }
  };

  const handleDeny = async (comment, privateComment) => {
    try {
      if (comment || privateComment) {
        await Meteor.callAsync("certificates.addComment", attestationId, comment, privateComment);
      }
      await Meteor.callAsync("certificates.remove", attestationId);
      navigate("/certificates", { state: { tab: "requests" } });
    } catch (err) {
      console.error("Error denying:", err);
      throw err;
    }
  };

  const handleSaveComments = async (comment, privateComment) => {
    try {
      await Meteor.callAsync("certificates.addComment", attestationId, comment, privateComment);
      await fetchData();
    } catch (err) {
      console.error("Error saving comments:", err);
      throw err;
    }
  };

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <TopBar />
      <CertifierRequestDetail
        loading={loading}
        error={error}
        data={data}
        onConfirm={handleConfirm}
        onDeny={handleDeny}
        onSaveComments={handleSaveComments}
      />
      <BottomNavigation />
    </>
  );
};
