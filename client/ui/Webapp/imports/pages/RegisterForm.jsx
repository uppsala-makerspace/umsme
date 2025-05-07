import React, { useState } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "../components/LanguageSwitcher/langueSwitcher";
import { LogRegSwitcher } from "../components/LogRegSwitch/LogRegSwitcher";
import { useTranslation } from "react-i18next";
import { Meteor } from "meteor/meteor";

export const RegisterForm = () => {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [youth, setYouth] = useState(false);
  const [formType, setFormType] = useState("register");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    Accounts.createUser({ email, password }, (err) => {
      if (err) {
        if (err instanceof Meteor.Error && err.reason === "account-merge") {
          alert("E-postadressen är redan registrerad. Försök logga in.");
        } else {
          alert("Kunde inte skapa konto: " + err.message);
        }
      } else {
        FlowRouter.go("/waitForEmailVerification");
      }
    });
  };

  const toLogIn = () => {
    FlowRouter.go("/login");
  };

  return (
    <>
      <LanguageSwitcher />
      <form onSubmit={handleSubmit} className="login-form">
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
        <LogRegSwitcher
          setFormType={setFormType}
          formType={formType}
          onClick={toLogIn}
        />
        <p className="text-container">{t("registerText")}</p>
        <div className="form-group">
          <label htmlFor="email">{t("email")}</label>
          <input
            type="email"
            id="email"
            placeholder={t("exEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">{t("password")}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirm-password">{t("passwordConfirm")}</label>
          <input
            type="password"
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="form-button">
          {t("register")}
        </button>
      </form>
    </>
  );
};
