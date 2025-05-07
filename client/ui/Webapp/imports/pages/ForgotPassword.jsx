// ForgotPassword.jsx
import React, { useState } from "react";
import { Accounts } from "meteor/accounts-base";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher/langueSwitcher";
import { L } from "chart.js/dist/chunks/helpers.segment";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { t, i18n } = useTranslation();

  const handleForgotPassword = (e) => {
    e.preventDefault();

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
      <div className="login-form">
        <h2>{t("ForgotPassword")}</h2>
        <p>{t("FillInEmail")}</p>
        <form onSubmit={handleForgotPassword}>
          <input
            type="email"
            placeholder={t("YourEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="form-button" type="submit">{t("SendLink")}</button>
        </form>
        {message && <p>{message}</p>}
      </div>
    </>
  );
};
