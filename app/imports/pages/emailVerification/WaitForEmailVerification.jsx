import React from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";

export default ({ onSendVerification }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col mx-auto w-full max-w-xl px-[2%] pb-[calc(80px+env(safe-area-inset-bottom))]">
      <h1 style={{ textAlign: "center" }}>{t("PleaseVerify")}</h1>
      <Button fullWidth onClick={onSendVerification}>
        {t("SendNewVerification")}
      </Button>
    </div>
  );
};
