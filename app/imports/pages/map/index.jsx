import React from "react";
import { Meteor } from "meteor/meteor";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Map from "./Map";

export default () => {
  const slackTeam = Meteor.settings?.public?.slack?.team;

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <Map slackTeam={slackTeam} />
    </Layout>
  );
};
