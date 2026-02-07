import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LoginButton } from "./LoginButton";
import { LogRegSwitcher } from "../../components/LogRegSwitch/LogRegSwitcher";
import Button from "../../components/Button";
import Input from "../../components/Input";
import MainContent from "../../components/MainContent";

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
    <MainContent>
      <form onSubmit={submit}>
        <img src="/images/UmLogo.png" alt="UM Logo" className="block max-w-[250px] w-full h-auto mt-6 mb-12 mx-auto" />

        <p className="flex items-start gap-2 text-sm text-gray-700 mb-4">
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
        <div className="flex flex-col gap-3">
          <Button type="submit" variant="primary" fullWidth>
            {t("login")}
          </Button>

          {google && (
            <LoginButton conf={{...googleConf, ...google}}/>
          )}
          {facebook && (
            <LoginButton conf={{...facebookConf, ...facebook}}/>
          )}
        </div>
      </form>
    </MainContent>
  );
};
