import React from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";

export default ({ onSendVerification }) => {
  const { t } = useTranslation();

  return (
    <MainContent>
      <h1 style={{ textAlign: "center" }}>{t("PleaseVerify")}</h1>
      <Button fullWidth onClick={onSendVerification}>
        {t("SendNewVerification")}
      </Button>
    </MainContent>
  );
};
