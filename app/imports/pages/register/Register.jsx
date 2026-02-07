import React, { useState } from "react";
import { LogRegSwitcher } from "/imports/components/LogRegSwitch/LogRegSwitcher";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";

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
        <label htmlFor="password">{t("setPassword")}</label>
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
        {!passwordsMatch && (
          <p className="text-red-500 mt-1">{t("PasswordNoMatch")}</p>
        )}
      </div>

      <Button type="submit" fullWidth>
        {t("register")}
      </Button>
    </form>
  );
};
