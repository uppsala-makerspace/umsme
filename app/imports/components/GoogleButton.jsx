import React from "react";
// import { FlowRouter } from "meteor/ostrio:flow-router-extra";
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
        if (
          err instanceof Meteor.Error &&
          err.reason ===
            "Det finns redan ett konto kopplat till den här adressen. Logga in med det kontot istället."
        ) {
          alert(
            "Google-verifiering har lagts till på ditt befintliga konto. Testa att logga in med google igen så kommer det fungera!"
          );
        } else {
          alert("Inloggningen misslyckades.");
        }
      } else {
//        FlowRouter.go("/loggedIn");
      }
    });
  };

  return (
    <button
      className="social-button"
      disabled={isDisabled}
      onClick={handleClick}
    >
      <img src="/images/GoogleLogo.png" alt="icon" className="button-icon" />
      {buttonText}
    </button>
  );
};
