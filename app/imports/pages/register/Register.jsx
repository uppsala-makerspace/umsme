import React, { useState } from "react";
import { LogRegSwitcher } from "/imports/components/LogRegSwitch/LogRegSwitcher";
import { useTranslation } from "react-i18next";
import { LoginButton } from "../login/LoginButton";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Logo from "../../components/Logo";
import MainContent from "../../components/MainContent";
import OrDivider from "../../components/OrDivider";
import WarningIcon from "../../components/WarningIcon";

const googleConf = {
  buttonTextKey: "loginGoogle",
  icon: "/images/GoogleLogo.png"
};

const facebookConf = {
  buttonTextKey: "loginFacebook",
  icon: "/images/FacebookLogo.png"
};

export default ({onSubmit, google, facebook}) => {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = !confirmPassword || password === confirmPassword;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!passwordsMatch) {
      return;
    }
    onSubmit({email, password});
  };

  return (
    <MainContent>
    <form onSubmit={handleSubmit}>
      <Logo />

      <p className="flex items-start gap-2 text-sm text-gray-700 mb-4">
        <WarningIcon />
        {t("useExistingEmailInfo")}
      </p>

      <LogRegSwitcher/>

      <Input
        label={t("email")}
        id="email"
        type="email"
        placeholder={t("exEmail")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Input
        label={t("setPassword")}
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Input
        label={t("passwordConfirm")}
        id="confirm-password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        error={!passwordsMatch ? t("PasswordNoMatch") : undefined}
      />

      <div className="flex flex-col gap-3">
        <Button type="submit" fullWidth>
          {t("register")}
        </Button>

        {(google || facebook) && <OrDivider />}
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
