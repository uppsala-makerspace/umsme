import React from "react";
import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { useNavigate, Navigate } from 'react-router-dom';
import Layout from "/imports/components/Layout/Layout";
import Register from './Register';

export default () => {
  let navigate = useNavigate();

  const oauth = Meteor.settings?.public?.oauth;
  const google = oauth?.google ? { method: Meteor.loginWithGoogle } : null;
  const facebook = oauth?.facebook ? { method: Meteor.loginWithFacebook } : null;

  const handleSubmit = ({email, password}) => {
    Accounts.createUser({ email, password }, (err) => {
      if (err) {
        if (err instanceof Meteor.Error && err.reason === "account-merge") {
          alert("E-postadressen är redan registrerad. Försök logga in.");
        } else {
          alert("Kunde inte skapa konto: " + err.message);
        }
      } else {
        navigate("/waitForEmailVerification");
      }
    });
  };

  return (
    <Layout bottomNav={false}>
      {Meteor.userId() ? (<Navigate to="/" />) : null}
      <Register onSubmit={handleSubmit} google={google} facebook={facebook} />
    </Layout>
  );
};
