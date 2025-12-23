import React from "react";
import { useTranslation } from "react-i18next";

export const LoginButton = ({conf}) => {
  const { t } = useTranslation();
  const buttonText = !conf ? "Please wait" : t(conf.buttonTextKey);

  const handleClick = () => {
    conf.method({}, (err) => {
      if (err) {
        if (err.code === "account-merge") {
          alert(t(conf.mergeMessageKey));
        } else {
          alert(t("loginFailed"));
        }
      }
    });
  };

  return (
    <button
      className="social-button"
      disabled={!conf}
      onClick={handleClick}
    >
      <img src={conf?.icon} alt="icon" className="button-icon" />
      {buttonText}
    </button>
  );
};
