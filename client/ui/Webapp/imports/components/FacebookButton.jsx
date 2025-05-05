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

  const loading = false;
  const isDisabled = loading || !configurationExists();
  const buttonText = isDisabled ? "Please wait" : t("logginFacebook");

  const handleClick = () => {
    Meteor.loginWithFacebook({}, (err) => {
      if (err) {
        if (err instanceof Meteor.Error && err.reason === "Det finns redan ett konto kopplat till den här adressen. Logga in med det kontot istället.") {
          alert("Facebook-verifiering har lagts till på ditt befintliga konto. Testa att logga in med facebook igen så kommer det fungera!")
        } else {
          alert("Inloggningen misslyckades.");
        }
      } else {
        FlowRouter.go("/loggedIn");
      }
    });
  };
  return (
    <button disabled={isDisabled} onClick={handleClick}>
      <img src="/images/FacebookLogo.png" alt="icon" className="button-icon" />
      {buttonText}
    </button>
  );
};
