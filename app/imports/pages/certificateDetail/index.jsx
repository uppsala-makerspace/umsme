import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "../../components/HamburgerMenu/HamburgerMenu";
import CertificateDetail from "./CertificateDetail.jsx";

export default () => {
  const { certificateId } = useParams();
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Meteor.callAsync("certificates.getDetails", certificateId);
      setData(result);
      setError(null);
    } catch (err) {
      console.error("Error fetching certificate details:", err);
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  const handleRequest = async () => {
    try {
      await Meteor.callAsync("certificates.request", certificateId);
      await fetchData();
    } catch (err) {
      console.error("Error requesting certificate:", err);
      throw err;
    }
  };

  const handleCancel = async (attestationId) => {
    try {
      await Meteor.callAsync("certificates.cancel", attestationId);
      await fetchData();
    } catch (err) {
      console.error("Error canceling request:", err);
      throw err;
    }
  };

  const handleReRequest = async (attestationId) => {
    try {
      await Meteor.callAsync("certificates.reRequest", attestationId);
      await fetchData();
    } catch (err) {
      console.error("Error re-requesting:", err);
      throw err;
    }
  };

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <CertificateDetail
        loading={loading}
        error={error}
        data={data}
        onRequest={handleRequest}
        onCancel={handleCancel}
        onReRequest={handleReRequest}
      />
    </>
  );
};
