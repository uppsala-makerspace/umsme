import { Meteor } from "meteor/meteor";
import React from "react";
import { Navigate } from "react-router-dom";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import Contact from "./Contact";

export default () => {
  const slackConfig = Meteor.settings?.public?.slack;

  return <>
    {!Meteor.userId() ? <Navigate to="/login" /> : null}
    <TopBar />
    <div className="login-form">
      <Contact slackConfig={slackConfig} />
    </div>
    <BottomNavigation />
  </>;
};
