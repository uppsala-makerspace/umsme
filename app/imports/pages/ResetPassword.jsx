import { Accounts } from "meteor/accounts-base";
import React, { useState } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher/langueSwitcher";

export const ResetPassword = ({ token }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const { t, i18n } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (password !== confirm) {
      setMessage(t("PasswordNoMatch"));
      return;
    }

    Accounts.resetPassword(token, password, (err) => {
      if (err) {
        setMessage(t("SomethingWentWrong") + err);
      } else {
        alert(t("PasswordReseted"));
        FlowRouter.go("/login");
      }
    });
  };

  return (
    <>
      <LanguageSwitcher />
      <br></br>
      <div className="login-form">
        <form onSubmit={handleSubmit}>
          <h2>{t("ResetPassword")}</h2>
          <input
            type="password"
            placeholder={t("newPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder={t("passwordConfirmNew")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button className="form-button" type="submit">
            {t("ResetPassword")}
          </button>
        </form>
        {message && (
          <p
            style={{
              color: message.includes("success") ? "green" : "red",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </>
  );
};
