import React from "react";
import { useTranslation } from "react-i18next";

export const GoogleButton = ({conf}) => {
  const { t } = useTranslation();
  const buttonText = !conf ? "Please wait" : t("loginGoogle");

  const handleClick = () => {
    conf.method({}, (err) => {
      if (err.code === "account-merge") {
        alert("Google-verifiering har lagts till på ditt befintliga konto. Testa att logga in med google igen så kommer det fungera!");
      } else {
        alert("Inloggningen misslyckades.");
      }
    });
  };

  return (
    <button
      className="social-button"
      disabled={!conf}
      onClick={handleClick}
    >
      <img src="/images/GoogleLogo.png" alt="icon" className="button-icon" />
      {buttonText}
    </button>
  );
};
