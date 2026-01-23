import React from "react";
import { Meteor } from "meteor/meteor";
import { Navigate } from "react-router-dom";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "/imports/components/HamburgerMenu/HamburgerMenu";
import BottomNavigation from "/imports/components/BottomNavigation";
import Map from "./Map";

export default () => {
  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <Map />
      <BottomNavigation />
    </>
  );
};
