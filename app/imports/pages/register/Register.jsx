import React, { useState } from "react";
import { LogRegSwitcher } from "/imports/components/LogRegSwitch/LogRegSwitcher";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";
import Input from "../../components/Input";

export default ({onSubmit}) => {
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
    <form onSubmit={handleSubmit} className="login-form">
      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />

      <p className="info-message">
        <span className="info-icon">⚠</span>
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

      <Button type="submit" fullWidth>
        {t("register")}
      </Button>
    </form>
  );
};
