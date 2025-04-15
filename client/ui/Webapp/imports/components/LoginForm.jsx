import { Meteor } from "meteor/meteor";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { GoogleButton } from "./GoogleButton";
import "../Appmain.css";
import { LanguageSwitcher } from "./langueSwitcher";
import { FacebookButton } from "./FacebookButton";
import { F } from "chart.js/dist/chunks/helpers.segment";
import { useTranslation } from "react-i18next";
import { LogRegSwitcher } from "./LogRegSwitcher";

export const LoginForm = () => {
  const { t, i18n } = useTranslation();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const user = useTracker(() => Meteor.user());
  const [formType, setFormType] = useState("login");
  const [isVerified, setIsVerified] = useState(true);

  useEffect(() => {
    if (user) {
      // Om användaren är inloggad men e-posten inte är verifierad:
      if (user.emails && user.emails.length > 0 && !user.emails[0].verified) {
        alert("Please verify your email before logging in.");
        FlowRouter.go("/waitForEmailVerification");

        Meteor.logout(); // Logga ut användaren
        setIsVerified(false); // Sätt isVerified till false
      } else {
        setIsVerified(true); // Sätt isVerified till true
        FlowRouter.go("/loggedIn"); // Navigera till annan route om e-posten är verifierad
      }
    }
  }, [user]);

  const submit = (e) => {
    e.preventDefault();
    Meteor.loginWithPassword(email, password, (err) => {
      if (err) {
        console.error("Login failed:", err);
        alert(
          "Login failed. Please check that your email and password are correct."
        );
      } else {
        FlowRouter.go("/loggedIn");
      }
    });
  };

  const toRegister = () => {
    FlowRouter.go("/register"); // Redirect to the login page
  };
  console.log("Current language:", i18n.language);

  return (
    <>
      <LanguageSwitcher />
      <form onSubmit={submit} className="login-form">
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />

        <LogRegSwitcher
          setFormType={setFormType}
          formType={formType}
          onClick={() => toRegister()}
        />

        <div className="form-group">
          <label htmlFor="email">{t("email")}</label>

          <input
            type="email"
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

        {!isVerified && (
          <div className="form-group">
            <button type="button" onClick={sendVerificationEmail}>
              Send New verification e-mail
            </button>
          </div>
        )}

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
