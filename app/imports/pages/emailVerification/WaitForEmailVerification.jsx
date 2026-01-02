import React from "react";
import { useTranslation } from "react-i18next";

export default ({ onSendVerification }) => {
  const { t } = useTranslation();

  return (
    <div className="login-form">
      <h1 style={{ textAlign: "center" }}>{t("PleaseVerify")}</h1>
      <div className="form-group">
        <button
          className="form-button"
          onClick={onSendVerification}
        >
          {t("SendNewVerification")}
        </button>
      </div>
    </div>
  );
};
