import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";

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
    <div className="login-form">
      <form onSubmit={handleSubmit}>
        <h3 className="text-h3">{t("ResetPassword")}</h3>
        <input
          type="password"
          placeholder={t("newPassword")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder={t("passwordConfirmNew")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {showMismatchWarning && (
          <p className="text-red-600 text-sm">{t("PasswordNoMatch")}</p>
        )}
        <Button type="submit" fullWidth disabled={!isValid}>
          {t("ResetPassword")}
        </Button>
      </form>
      {message && <p className="text-container">{message}</p>}
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
