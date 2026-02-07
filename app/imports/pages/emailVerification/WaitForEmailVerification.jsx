import React from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";

export default ({ onSendVerification }) => {
  const { t } = useTranslation();

  return (
    <div className="login-form">
      <h1 style={{ textAlign: "center" }}>{t("PleaseVerify")}</h1>
      <Button fullWidth onClick={onSendVerification}>
        {t("SendNewVerification")}
      </Button>
    </div>
  );
};
