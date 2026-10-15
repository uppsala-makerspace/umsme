import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LogRegSwitcher } from "/imports/components/LogRegSwitch/LogRegSwitcher";
import { useTranslation } from "react-i18next";
import SocialLogins from "../login/SocialLogins";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Logo from "../../components/Logo";
import MainContent from "../../components/MainContent";
import WarningIcon from "../../components/WarningIcon";

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

      <Link to="/check-email" className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 no-underline hover:bg-yellow-100">
        <WarningIcon />
        <span>{t("useExistingEmailInfo")} <span className="underline">{t("checkEmailLink")}</span></span>
      </Link>

      <SocialLogins google={google} facebook={facebook} />

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

      <Button type="submit" fullWidth>
        {t("register")}
      </Button>
    </form>
    </MainContent>
  );
};
