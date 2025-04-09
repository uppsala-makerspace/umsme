import { Meteor } from "meteor/meteor";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { GoogleButton } from "./GoogleButton";
import "../Appmain.css";
import { LanguageSwitcher } from './langueSwitcher';
import { FacebookButton } from "./FacebookButton";
import { F } from "chart.js/dist/chunks/helpers.segment";
import { useTranslation } from "react-i18next";

export const LoginForm = () => {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const user = useTracker(() => Meteor.user());

  useEffect(() => {
    

    if (user) {
      // Om användaren är inloggad men e-posten inte är verifierad, logga ut
      if (user.emails && user.emails.length > 0 && !user.emails[0].verified) {
        alert('Please verify your email before logging in.');
        Meteor.logout(); // Logga ut om e-posten inte är verifierad
        FlowRouter.go("/login"); // Skicka tillbaka till login-sidan
      } else {
        FlowRouter.go("/loggedIn"); // Navigera till annan route om e-posten är verifierad
      }
      
    }
  }, [user]);

  const submit = (e) => {
    e.preventDefault();
    Meteor.loginWithPassword(email, password, (err) => {
      if (err) {
        console.error('Login failed:', err);
        alert('Invalid credentials or email not verified');
      }
    });
  };

  const toRegister = () => {
    FlowRouter.go('/register'); // Redirect to the login page
  }
  console.log('Current language:', i18n.language);

  return (
    <>
    <LanguageSwitcher />
    <form onSubmit={submit} className="login-form">
      

      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo"/>
      <div className="form-group">
      <button onClick={() => toRegister()}>{t('register')}</button>
        <label htmlFor="email">Email:</label>
        <input
            type="email"
            placeholder="Email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>

        <input
            type="password"
            placeholder="Password"
            name="password"
            required
            onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div>
        <button type="submit" className="form-button">Log In</button>
        
      </div>

      <div className="form-group">
        <GoogleButton />
      </div>

      <div className="form-group">
        <FacebookButton />
      </div>

    </form>
    </>
  );
};