import React from "react";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import WaitForEmailVerification from "./WaitForEmailVerification";

export default () => {
  const user = useTracker(() => Meteor.user(), []);
  const verified = user && user.emails[0].verified;

  const handleSendVerification = () => {
    Meteor.call("sendVerificationEmail");
  };

  if (!user) {
    return <Navigate to="/login" replace={true} />;
  }

  if (verified) {
    return <Navigate to="/" replace={true} />;
  }

  return (
    <Layout bottomNav={false}>
      <WaitForEmailVerification
        onSendVerification={handleSendVerification}
      />
    </Layout>
  );
};
