import React, { useState } from "react";
import { Meteor } from "meteor/meteor";
import Layout from "/imports/components/Layout/Layout";
import CheckEmail from "./CheckEmail";

export default () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (email) => {
    setLoading(true);
    try {
      await Meteor.callAsync("checkMemberEmail", email);
    } catch (err) {
      console.error("Error checking email:", err);
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <Layout bottomNav={false} showNotifications={false}>
      <CheckEmail onSubmit={handleSubmit} loading={loading} submitted={submitted} />
    </Layout>
  );
};
