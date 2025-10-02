import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { GoogleButton } from "../../components/GoogleButton";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { FacebookButton } from "../../components/FacebookButton";
import { useTranslation } from "react-i18next";
import { LogRegSwitcher } from "../../components/LogRegSwitch/LogRegSwitcher";
import { Navigate } from 'react-router-dom';

export default Login => {
  const { t, i18n } = useTranslation();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const user = useTracker(() => Meteor.user());

  const unverifiedUser = user && user.emails.length > 0 && !user.emails[0].verified;
  const verified = user && user.emails.length > 0 && user.emails[0].verified;

  const submit = (e) => {
    e.preventDefault();
    Meteor.loginWithPassword(email, password, (err) => {
      if (err) {
        console.error("Login failed:", err);
        alert(
          "Login failed. Please check that your email and password are correct."
        );
      }
    });
  };

  return (
    <>
      <LanguageSwitcher />
      {unverifiedUser ? (<Navigate to="/waitForEmailVerification" />) : null}
      {verified ? (<Navigate to="/" />) : null}
      <form onSubmit={submit} className="login-form">
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />

        <LogRegSwitcher />

        <div className="form-group">
          <label htmlFor="email">{t("email")}</label>

          <input
            type="text"
            placeholder={t("exEmail")}
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">{t("password")}</label>

          <input
            type="password"
            placeholder={t("password")}
            name="password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <p>
          <a
            href="/ForgotPassword"
            style={{ fontSize: "0.9em", marginTop: "-3px" }}
          >
            {t("ForgotPassword")}
          </a>
        </p>
        <div className="form-group">
          <button type="submit" className="form-button">
            {t("login")}
          </button>
        </div>

        <div className="form-group">
          <GoogleButton />
        </div>

        <div className="form-group">
          <FacebookButton />
        </div>
      </form>
    </>
  );
};
