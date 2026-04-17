import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Logo from "../../components/Logo";
import MainContent from "../../components/MainContent";

export default ({ onSubmit, loading, submitted }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <MainContent>
      <Logo />
      <h2 className="text-center mb-4">{t("checkEmailTitle")}</h2>

      {!submitted ? (
        <form onSubmit={handleSubmit}>
          <p className="text-sm text-gray-700 mb-4">{t("checkEmailInfo")}</p>
          <Input
            label={t("email")}
            id="check-email"
            type="email"
            placeholder={t("exEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "..." : t("checkEmailSubmit")}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-700 bg-green-50 border border-green-200 rounded p-3">
            {t("checkEmailSent")}
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/register" className="w-full block no-underline text-center">
              <Button fullWidth variant="primary">{t("checkEmailBack")}</Button>
            </Link>
            <Link to="/login" className="w-full block no-underline text-center">
              <Button fullWidth variant="secondary">{t("login")}</Button>
            </Link>
          </div>
        </div>
      )}
    </MainContent>
  );
};
