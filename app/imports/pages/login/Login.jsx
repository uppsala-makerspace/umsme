import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import SocialLogins from "./SocialLogins";
import { LogRegSwitcher } from "../../components/LogRegSwitch/LogRegSwitcher";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Logo from "../../components/Logo";
import MainContent from "../../components/MainContent";
import WarningIcon from "../../components/WarningIcon";

/**
 * The login form. `errorKey` is an i18n key for why the last attempt failed,
 * shown under the fields; `onChange` lets the container clear it as soon as
 * the member edits a field. Google/Facebook sit above the tabs and report their
 * own failures (SocialLogins).
 */
export default ({ google, facebook, onSubmit, errorKey = null, onChange = () => {} }) => {
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
        <Logo />

        <Link to="/check-email" className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 no-underline hover:bg-yellow-100">
          <WarningIcon />
          <span>{t("useExistingEmailInfo")} <span className="underline">{t("checkEmailLink")}</span></span>
        </Link>

        <SocialLogins google={google} facebook={facebook} />

        <LogRegSwitcher />

        <Input
          label={t("email")}
          id="email"
          type="text"
          placeholder={t("exEmail")}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            onChange();
          }}
          required
        />

        <Input
          label={t("password")}
          id="password"
          type="password"
          placeholder={t("password")}
          name="password"
          required
          onChange={(e) => {
            setPassword(e.target.value);
            onChange();
          }}
        />
        {errorKey && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 mt-1 mb-3">
            {t(errorKey)}
          </p>
        )}
        <p className="text-center mt-0 mb-6">
          <Link to="/forgotPassword" className="text-sm">
            {t("ForgotPassword")}
          </Link>
        </p>
        <Button type="submit" variant="primary" fullWidth>
          {t("login")}
        </Button>
      </form>
    </MainContent>
  );
};
