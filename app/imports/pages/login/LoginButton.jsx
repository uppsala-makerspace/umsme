import React from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";

export const LoginButton = ({ conf, onError = () => {} }) => {
  const { t } = useTranslation();
  const buttonText = !conf ? "Please wait" : t(conf.buttonTextKey);

  const handleClick = () => {
    conf.method({}, (err) => {
      // Closing the provider's popup is not a failure worth reporting.
      if (err && err.errorType !== "Accounts.LoginCancelledError") {
        onError("loginFailed");
      }
    });
  };

  return (
    // type="button": the buttons sit inside the login form, and a button
    // without a type is a submit button. Enter in the password field would
    // then "click" the first of them, Google, as well as log in by email.
    <Button
      type="button"
      variant="social"
      fullWidth
      disabled={!conf}
      onClick={handleClick}
    >
      <img src={conf?.icon} alt="icon" className="w-6 h-6" />
      {buttonText}
    </Button>
  );
};
