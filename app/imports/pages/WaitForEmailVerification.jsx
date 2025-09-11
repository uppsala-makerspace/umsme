import React from "react";
import { Navigate, Link } from 'react-router-dom';
import { useTracker } from "meteor/react-meteor-data";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher/langueSwitcher";

export const WaitForEmailVerification = () => {
  const user = useTracker(() => Meteor.user(), []);
  const { t } = useTranslation();
  const verified = user && user.emails[0].verified;

  return (
    <>
      <LanguageSwitcher />
      <br></br>
      <br></br>
      <h1 style={{ textAlign: "center" }}>{t("PleaseVerify")}</h1>
      <div className="login-form">
        {verified ? (<Navigate to="/loggedIn" replace={true} />) : (
          <div className="form-group">
            <button
              className="form-button"
              onClick={() => Meteor.call("sendVerificationEmail")}
            >
              {t("SendNewVerification")}
            </button>
          </div>
        )}

        {!user ? (
          <div className="form-group">
            <Link to="/login"><button className="form-button white">{t("BackToLogin")}</button></Link>
          </div>
        ) : null}
      </div>
    </>
  );
};