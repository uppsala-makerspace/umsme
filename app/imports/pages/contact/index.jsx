import { Meteor } from "meteor/meteor";
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { AppDataContext } from "/imports/context/AppDataContext";
import Contact from "./Contact";

export default () => {
  const { slackChannels } = useContext(AppDataContext);
  const slackTeam = Meteor.settings?.public?.slack?.team;

  return <Layout>
    {!Meteor.userId() ? <Navigate to="/login" /> : null}
    <Contact slackTeam={slackTeam} slackChannelIds={slackChannels} />
  </Layout>;
};
