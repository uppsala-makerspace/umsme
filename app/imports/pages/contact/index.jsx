import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Contact from "./Contact";

export default () => {
  const [slackChannelIds, setSlackChannelIds] = useState(null);
  const slackTeam = Meteor.settings?.public?.slack?.team;

  useEffect(() => {
    fetch("/data/slack-channels.json")
      .then((res) => res.json())
      .then((data) => setSlackChannelIds(data))
      .catch((err) => console.error("Failed to load slack channels:", err));
  }, []);

  return <Layout>
    {!Meteor.userId() ? <Navigate to="/login" /> : null}
    <Contact slackTeam={slackTeam} slackChannelIds={slackChannelIds} />
  </Layout>;
};
