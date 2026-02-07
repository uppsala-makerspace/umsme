import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";
import Input from "../../components/Input";

const ResetPassword = ({ message, onSubmit }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { t } = useTranslation();

  const isValid = password.length > 0 && confirm.length > 0 && password === confirm;
  const showMismatchWarning = password.length > 0 && confirm.length > 0 && password !== confirm;
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(password);
    }
  };

  return (
    <div className="flex flex-col mx-auto w-full max-w-xl px-[2%] pb-[calc(80px+env(safe-area-inset-bottom))]">
      <form onSubmit={handleSubmit}>
        <h3 className="text-center">{t("ResetPassword")}</h3>
        <Input
          type="password"
          placeholder={t("newPassword")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder={t("passwordConfirmNew")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={showMismatchWarning ? t("PasswordNoMatch") : undefined}
        />
        <Button type="submit" fullWidth disabled={!isValid}>
          {t("ResetPassword")}
        </Button>
      </form>
      {message && <p className="flex flex-col items-center text-center mt-5 mb-4">{message}</p>}
    </div>
  );
};

ResetPassword.propTypes = {
  /** Message to display (success or error from server) */
  message: PropTypes.string,
  /** Callback when form is submitted with matching passwords, receives password as argument */
  onSubmit: PropTypes.func.isRequired,
};

ResetPassword.defaultProps = {
  message: "",
};

export default ResetPassword;
