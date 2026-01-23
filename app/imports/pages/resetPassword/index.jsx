import React, { useState } from "react";
import TopBar from "/imports/components/TopBar";
import { Accounts } from "meteor/accounts-base";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ResetPassword from "./ResetPassword";

export default () => {
  const [message, setMessage] = useState("");
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams();

  const handleResetPassword = (password) => {
    Accounts.resetPassword(token, password, (err) => {
      if (err) {
        setMessage(t("SomethingWentWrong") + err);
      } else {
        alert(t("PasswordReseted"));
        navigate("/login");
      }
    });
  };

  return (
    <>
      <TopBar />
      <ResetPassword message={message} onSubmit={handleResetPassword} />
    </>
  );
};
