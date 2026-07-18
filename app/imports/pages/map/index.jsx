import React, { useState, useEffect } from "react";
import { Meteor } from "meteor/meteor";
import { Navigate, useSearchParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import FloorMap from "/imports/components/FloorMap";
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
      <FloorMap
        slackTeam={slackTeam}
        roomsConfig={roomsConfig}
        slackChannels={slackChannels}
        highlightedSpaceId={searchParams.get("space")}
        highlightedFloor={
          // spaceId is only unique per floor (e.g. "kitchen" exists on
          // both), so ?floor= pins the highlight to a single room.
          searchParams.get("floor")
        }
        highlightColor={
          // ?color=<name> is resolved against the whitelist; anything else
          // (including no parameter) falls back to green. Map clicks reset
          // the color to green from then on.
          SPACE_COLORS[searchParams.get("color")] ||
          SPACE_COLORS[DEFAULT_SPACE_COLOR_NAME]
        }
        onSpaceSelected={(spaceId, floorKey) =>
          setSearchParams({ space: spaceId, floor: floorKey }, { replace: true })
        }
      />
    </Layout>
  );
};
