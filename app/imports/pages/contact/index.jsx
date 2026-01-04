import React from "react";
import { Navigate } from "react-router-dom";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "/imports/components/HamburgerMenu/HamburgerMenu";
import Contact from "./Contact";

export default () => {
  return <>
    {!Meteor.userId() ? <Navigate to="/login" /> : null}
    <LanguageSwitcher />
    <HamburgerMenu />
    <div className="login-form">
      <Contact />
    </div>
  </>;
};
