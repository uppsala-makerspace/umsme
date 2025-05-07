import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { useTracker } from "meteor/react-meteor-data";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher/langueSwitcher";

export const WaitForEmailVerification = () => {
  const user = useTracker(() => Meteor.user(), []);
  const { t, i18n } = useTranslation();
  const toLogIn = () => {
    Meteor.logout(() => {
      FlowRouter.go("/login");
    });
  };

  useEffect(() => {
    if (user) {
      // Om användaren är inloggad men e-posten inte är verifierad:
      if (user.emails[0].verified) {
        FlowRouter.go("/loggedIn"); // Navigera till annan route om e-posten är verifierad
      }
    }
  }, [user]);

  return (
    <>
    <LanguageSwitcher />
    <h1 style={{textAlign: "center"}}>{t("PleaseVerify")}</h1>
    <div className="login-form">
    <div className="form-group">
        <button
          className="form-button"
          onClick={() => Meteor.call("sendVerificationEmail")}
        >
          {t("SendNewVerification")}
        </button>
      </div>

      <div className="form-group">
        <button className="button" onClick={() => toLogIn()}>
          {t("BackToLogin")}
        </button>
      </div>
    </div>
    </>
  );
};
