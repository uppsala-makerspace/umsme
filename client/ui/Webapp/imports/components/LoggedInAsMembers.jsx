import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { HamburgerMenu } from "./HamburgerMenu";


export const LoggedInAsMember = () => {
  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      } else {
        FlowRouter.go("/login");
      }
    });
  };

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <div className="login-form">
        <button className="round-button">
          M
        </button>
        <h3>Hejsan!</h3>
        <p>Du är inloggad som medlem.</p>
        <button onClick={logout}>Logga ut</button>
      </div>
    </>
  );
};

