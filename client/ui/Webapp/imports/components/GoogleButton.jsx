import React from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { useTracker } from "meteor/react-meteor-data";
import { useTranslation } from "react-i18next";

export const GoogleButton = () => {
  const { t, i18n } = useTranslation();
  const user = useTracker(() => Meteor.user());

  const configurationExists = () => {
    return ServiceConfiguration.configurations.findOne({
      service: "google",
    });
  };

  const loading = false;
  const isDisabled = loading || !configurationExists();
  const buttonText = isDisabled ? "Please wait" : t("logginGoogle");

  const handleClick = () => {
    Meteor.loginWithGoogle({}, (err) => {
      if (err) {
        console.error("Google login failed", err);
      } else {
        const user = Meteor.user();
        FlowRouter.go("/loggedIn");
      }
    });
  };

  return (
    <button disabled={isDisabled} onClick={handleClick}>
      <img src="/images/GoogleLogo.png" alt="icon" className="button-icon" />
      {buttonText}
    </button>
  );
};
