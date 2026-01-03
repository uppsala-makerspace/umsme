import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const ForgotPassword = ({ message, onSubmit }) => {
  const [email, setEmail] = useState("");
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <div className="login-form">
      <h3 className="text-h3">{t("ForgotPassword")}</h3>
      <p className="text-container">{t("FillInEmail")}</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder={t("YourEmail")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="form-button" type="submit">
          {t("SendLink")}
        </button>
      </form>
      {message && <p className="text-container">{message}</p>}
    </div>
  );
};

ForgotPassword.propTypes = {
  /** Message to display (success or error) */
  message: PropTypes.string,
  /** Callback when form is submitted, receives email as argument */
  onSubmit: PropTypes.func.isRequired,
};

ForgotPassword.defaultProps = {
  message: "",
};

export default ForgotPassword;
