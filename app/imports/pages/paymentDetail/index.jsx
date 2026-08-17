import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import PaymentDetail from "./PaymentDetail.jsx";

export default () => {
  const { paymentId } = useParams();
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Meteor.callAsync("payment.getDetail", paymentId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <PaymentDetail
        loading={loading}
        error={error}
        payment={data?.payment}
        item={data?.item}
        memberName={data?.memberName}
      />
    </Layout>
  );
};
