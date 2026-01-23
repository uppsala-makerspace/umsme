import React from "react";
import TopBar from "/imports/components/TopBar";
import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { useNavigate, Navigate } from 'react-router-dom';
import Register from './Register';

export default () => {
  let navigate = useNavigate();

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
    <>
      <TopBar />
      {Meteor.userId() ? (<Navigate to="/" />) : null}
      <Register onSubmit={handleSubmit} />
    </>
  );
};
