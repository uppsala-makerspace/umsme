import { Meteor } from "meteor/meteor";
import React from "react";
import { Navigate } from "react-router-dom";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "/imports/components/HamburgerMenu/HamburgerMenu";
import BottomNavigation from "/imports/components/BottomNavigation";
import Contact from "./Contact";

export default () => {
  const slackConfig = Meteor.settings?.public?.slack;

  return <>
    {!Meteor.userId() ? <Navigate to="/login" /> : null}
    <LanguageSwitcher />
    <HamburgerMenu />
    <div className="login-form">
      <Contact slackConfig={slackConfig} />
    </div>
    <BottomNavigation />
  </>;
};
