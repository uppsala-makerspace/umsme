import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LoginButton } from "./LoginButton";
import { LogRegSwitcher } from "../../components/LogRegSwitch/LogRegSwitcher";
import Button from "../../components/Button";
import Input from "../../components/Input";

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

        <Input
          label={t("email")}
          id="email"
          type="text"
          placeholder={t("exEmail")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label={t("password")}
          id="password"
          type="password"
          placeholder={t("password")}
          name="password"
          required
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-center">
          <Link to="/forgotPassword" className="text-sm -mt-1">
            {t("ForgotPassword")}
          </Link>
        </p>
        <Button type="submit" variant="primary" fullWidth>
          {t("login")}
        </Button>

        {google && (
          <LoginButton conf={{...googleConf, ...google}}/>
        )}
        {facebook && (
          <LoginButton conf={{...facebookConf, ...facebook}}/>
        )}
      </form>
    </>
  );
};
