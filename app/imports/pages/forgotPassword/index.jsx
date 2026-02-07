import React, { useState } from "react";
import { Accounts } from "meteor/accounts-base";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import ForgotPassword from "./ForgotPassword";

export default () => {
  const [message, setMessage] = useState("");
  const { t } = useTranslation();

  const handleForgotPassword = (email) => {
    Accounts.forgotPassword({ email }, (error) => {
      if (error) {
        setMessage(t("CouldNotFind"));
      } else {
        setMessage(t("SentResetEmail") + email);
      }
    });
  };

  return (
    <Layout bottomNav={false}>
      <ForgotPassword message={message} onSubmit={handleForgotPassword} />
    </Layout>
  );
};
