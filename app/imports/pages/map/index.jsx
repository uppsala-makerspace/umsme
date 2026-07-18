import React, { useState, useEffect } from "react";
import { Meteor } from "meteor/meteor";
import { Navigate, useSearchParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Map from "./Map";
import {
  SPACE_COLORS,
  DEFAULT_SPACE_COLOR_NAME,
} from "/imports/utils/spaceColors";

export default () => {
  const slackTeam = Meteor.settings?.public?.slack?.team;
  const [searchParams, setSearchParams] = useSearchParams();
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
        highlightedSpaceId={searchParams.get("space")}
        highlightColor={
          // ?color=<name> is resolved against the whitelist; anything else
          // (including no parameter) falls back to green. Map clicks write
          // only ?space=, so the color resets to green from then on.
          SPACE_COLORS[searchParams.get("color")] ||
          SPACE_COLORS[DEFAULT_SPACE_COLOR_NAME]
        }
        onSpaceSelected={(spaceId) => setSearchParams({ space: spaceId }, { replace: true })}
      />
    </Layout>
  );
};
