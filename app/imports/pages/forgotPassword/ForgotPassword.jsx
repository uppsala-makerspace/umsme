import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";
import Input from "../../components/Input";

const ForgotPassword = ({ message, onSubmit }) => {
  const [email, setEmail] = useState("");
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <div className="flex flex-col mx-auto w-full max-w-xl px-[2%] pb-[calc(80px+env(safe-area-inset-bottom))]">
      <h3 className="text-center">{t("ForgotPassword")}</h3>
      <p className="flex flex-col items-center text-center mt-5 mb-4">{t("FillInEmail")}</p>
      <form onSubmit={handleSubmit}>
        <Input
          type="email"
          placeholder={t("YourEmail")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" fullWidth>
          {t("SendLink")}
        </Button>
      </form>
      {message && <p className="flex flex-col items-center text-center mt-5 mb-4">{message}</p>}
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
