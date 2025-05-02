import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { useTracker } from "meteor/react-meteor-data";

export const WaitForEmailVerification = () => {
  const user = useTracker(() => Meteor.user(), []);
  const toLogIn = () => {
    Meteor.logout(() => {
      FlowRouter.go("/login");
    });
  };

  useEffect(() => {
    if (user) {
      // Om användaren är inloggad men e-posten inte är verifierad:
      Meteor.call(
        "createMemberFromPending",
        user.emails[0].address,
        (err, res) => {
          if (err) {
            console.error("❌ Kunde inte skapa medlem från pending:", err);
          } else {
            console.log("✅ Medlem skapad:", res);
            FlowRouter.go("/loggedIn");
          }
        }
      );
    }
  }, [user]);

  return (
    <div>
      <h1>Vänligen verifiera din e-postadress</h1>

      <div className="form-group">
        <button className="button" onClick={() => toLogIn()}>
          Back to Login
        </button>
      </div>
      <div className="form-group">
        <button
          className="button"
          onClick={() => Meteor.call("sendVerificationEmail")}
        >
          Skicka nytt verifieringsmail
        </button>
      </div>
    </div>
  );
};
