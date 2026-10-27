import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { safeReturnTo } from "../../expenses/utils";
import Layout from "/imports/components/Layout/Layout";
import CertifierRequestDetail from "./CertifierRequestDetail.jsx";

export default () => {
  const user = useTracker(() => Meteor.user());
  const { attestationId } = useParams();
  const navigate = useNavigate();
  // Opened from an event's participants, confirming or removing goes back there.
  const [searchParams] = useSearchParams();
  const doneTo = safeReturnTo(searchParams.get("returnTo")) || "/certificates?tab=requests";
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
      navigate(doneTo);
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
      navigate(doneTo);
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
    <Layout>
      <CertifierRequestDetail
        loading={loading}
        error={error}
        data={data}
        onConfirm={handleConfirm}
        onDeny={handleDeny}
        onSaveComments={handleSaveComments}
      />
    </Layout>
  );
};
