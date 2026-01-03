import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LoginButton } from "./LoginButton";
import { LogRegSwitcher } from "../../components/LogRegSwitch/LogRegSwitcher";

const googleConf = {
  buttonTextKey: "loginGoogle",
  mergeMessageKey: "oauthMergeGoogle",
  icon: "/images/GoogleLogo.png"
};

const facebookConf = {
  buttonTextKey: "loginFacebook",
  mergeMessageKey: "oauthMergeFacebook",
  icon: "/images/FacebookLogo.png"
};

export default ({google, facebook}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

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
          <Link to="/forgotPassword" className="text-sm -mt-1">
            {t("ForgotPassword")}
          </Link>
        </p>
        <div className="form-group">
          <button type="submit" className="form-button">
            {t("login")}
          </button>
        </div>

        {google && (<div className="form-group">
          <LoginButton conf={{...googleConf, ...google}}/>
        </div>)}
        {facebook && (<div className="form-group">
          <LoginButton conf={{...facebookConf, ...facebook}}/>
        </div>)}
      </form>
    </>
  );
};
