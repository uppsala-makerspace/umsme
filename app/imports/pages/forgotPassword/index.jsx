import React, { useState } from "react";
import { Accounts } from "meteor/accounts-base";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import ForgotPassword from "./ForgotPassword";

export default () => {
  const [message, setMessage] = useState("");
  const { t } = useTranslation();

  const handleForgotPassword = (email) => {
    Accounts.forgotPassword({ email }, (error) => {
      if (error) {
        setMessage(t("CouldNotFind") + error);
      } else {
        setMessage(t("SentResetEmail") + email);
      }
    });
  };

  return (
    <>
      <LanguageSwitcher />
      <ForgotPassword message={message} onSubmit={handleForgotPassword} />
    </>
  );
};
