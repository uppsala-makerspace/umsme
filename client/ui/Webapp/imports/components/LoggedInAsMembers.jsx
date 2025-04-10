import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";

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
    <div>
      <h1>Välkommen medlem!</h1>
      <p>Du är inloggad som medlem.</p>
      <button onClick={logout}>Logga ut</button>
    </div>
  );
};
