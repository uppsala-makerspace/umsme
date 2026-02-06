import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LoginButton } from "./LoginButton";
import { LogRegSwitcher } from "../../components/LogRegSwitch/LogRegSwitcher";
import Button from "../../components/Button";

const googleConf = {
  buttonTextKey: "loginGoogle",
  icon: "/images/GoogleLogo.png"
};

const facebookConf = {
  buttonTextKey: "loginFacebook",
  icon: "/images/FacebookLogo.png"
};

export default ({google, facebook, onSubmit}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <>
      <form onSubmit={submit} className="login-form">
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />

        <p className="info-message">
          <span className="info-icon">⚠</span>
          {t("useExistingEmailInfo")}
        </p>

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
        <p className="text-center">
          <Link to="/forgotPassword" className="text-sm -mt-1">
            {t("ForgotPassword")}
          </Link>
        </p>
        <div className="form-group">
          <Button type="submit" variant="primary" fullWidth>
            {t("login")}
          </Button>
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
