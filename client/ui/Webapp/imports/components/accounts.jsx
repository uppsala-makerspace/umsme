import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";

export const Accounts = () => {
  const user = Meteor.userId();
  return (
    <div>
      <h2>Ditt konto</h2>
    </div>
  );
};
