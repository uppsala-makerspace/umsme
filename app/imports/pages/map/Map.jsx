import React from "react";
import { useTranslation } from "react-i18next";

const Map = () => {
  const { t } = useTranslation();

  return (
    <div className="login-form">
      <h3 className="text-h3">{t("mapPageTitle")}</h3>
      <p className="text-center text-gray-600 mt-4">{t("mapTodo")}</p>
    </div>
  );
};

export default Map;
