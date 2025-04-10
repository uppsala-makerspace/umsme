import React from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { useTracker } from "meteor/react-meteor-data";
import { useTranslation } from "react-i18next";

export const FacebookButton = () => {
  const { t, i18n } = useTranslation();
  const user = useTracker(() => Meteor.user());

  const configurationExists = () => {
    return ServiceConfiguration.configurations.findOne({
      service: "facebook",
    });
  };
  const configurationExists = () => {
    return ServiceConfiguration.configurations.findOne({
      service: "facebook",
    });
  };

  const loading = false;
  const isDisabled = loading || !configurationExists();
  const buttonText = isDisabled ? "Please wait" : t("logginFacebook");

  const handleClick = () => {
    Meteor.loginWithFacebook({}, (err) => {
      Meteor.logout();
      if (err) {
        console.error("Facebook login failed", err);
      } else {
        console.log("Facebook login successful");
        const user = Meteor.user();
        FlowRouter.go("/loggedIn");
      }
    });
  };
  return (
  };
  return (
    <button disabled={isDisabled} onClick={handleClick}>
      <img src="/images/FacebookLogo.png" alt="icon" className="button-icon" />
      <img src="/images/FacebookLogo.png" alt="icon" className="button-icon" />
      {buttonText}
    </button>
  );
};

  );
};
