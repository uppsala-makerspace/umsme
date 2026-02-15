import React, { useState, useEffect } from "react";
import { Meteor } from "meteor/meteor";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Map from "./Map";

export default () => {
  const slackTeam = Meteor.settings?.public?.slack?.team;
  const [roomsConfig, setRoomsConfig] = useState(null);
  const [slackChannels, setSlackChannels] = useState(null);

  useEffect(() => {
    Meteor.callAsync("data.rooms")
      .then((data) => setRoomsConfig(data))
      .catch((err) => console.error("Failed to load rooms config:", err));

    Meteor.callAsync("data.slackChannels")
      .then((data) => setSlackChannels(data))
      .catch((err) => console.error("Failed to load slack channels:", err));
  }, []);

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout scroll={false}>
      <Map
        slackTeam={slackTeam}
        roomsConfig={roomsConfig}
        slackChannels={slackChannels}
      />
    </Layout>
  );
};
