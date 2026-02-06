import React from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";

export const LoginButton = ({conf}) => {
  const { t } = useTranslation();
  const buttonText = !conf ? "Please wait" : t(conf.buttonTextKey);

  const handleClick = () => {
    conf.method({}, (err) => {
      if (err) {
        alert(t("loginFailed"));
      }
    });
  };

  return (
    <Button
      variant="social"
      fullWidth
      disabled={!conf}
      onClick={handleClick}
    >
      <img src={conf?.icon} alt="icon" className="w-6 h-6" />
      {buttonText}
    </Button>
  );
};
