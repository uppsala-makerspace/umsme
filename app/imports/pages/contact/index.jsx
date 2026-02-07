import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
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

  return <>
    {!Meteor.userId() ? <Navigate to="/login" /> : null}
    <TopBar />
    <div className="flex flex-col mx-auto w-full max-w-xl px-[2%] pb-[calc(80px+env(safe-area-inset-bottom))]">
      <Contact slackTeam={slackTeam} slackChannelIds={slackChannelIds} />
    </div>
    <BottomNavigation />
  </>;
};
