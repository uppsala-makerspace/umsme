import React from "react";
import { Meteor } from "meteor/meteor";
import { Navigate } from "react-router-dom";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import Map from "./Map";

export default () => {
  const slackTeam = Meteor.settings?.public?.slack?.team;

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <TopBar />
      <Map slackTeam={slackTeam} />
      <BottomNavigation />
    </>
  );
};
