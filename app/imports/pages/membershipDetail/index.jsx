import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Meteor } from "meteor/meteor";
import Layout from "/imports/components/Layout/Layout";
import Loader from "/imports/components/Loader";
import MainContent from "/imports/components/MainContent";
import MembershipDetail from "./MembershipDetail";

export default () => {
  const { membershipId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const result = await Meteor.callAsync("membership.getDetail", membershipId);
        setData(result);
      } catch (err) {
        setError(err.reason || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [membershipId]);

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  if (loading) {
    return <Layout><MainContent><Loader /></MainContent></Layout>;
  }

  if (error || !data?.membership) {
    return <Layout><MainContent><p className="text-center text-sm">{error || "Not found"}</p></MainContent></Layout>;
  }

  return (
    <Layout>
      <MembershipDetail
        membership={data.membership}
        payment={data.payment}
        initiatedPayment={data.initiated}
      />
    </Layout>
  );
};
