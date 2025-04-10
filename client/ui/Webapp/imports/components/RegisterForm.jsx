import React, { useState } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { LogRegSwitcher } from "./LogRegSwitcher";
import { useTranslation } from "react-i18next";

export const RegisterForm = () => {
  const { t, i18n } = useTranslation();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formType, setFormType] = useState("register");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Email:", email);
    if (password === confirmPassword) {
      Accounts.createUser({ username, password, email }, (err) => {});
      setTimeout(() => {
        FlowRouter.go("/waitForEmailVerification");
      }, 1000); // Simulate a delay for user registration
    } else {
      console.error("Passwords do not match");
      alert("Passwords do not match");
    }
  };

  const toLogIn = () => {
    FlowRouter.go("/login"); // Redirect to the login page
  };

  return (
    <>
      <LanguageSwitcher />

      <form onSubmit={handleSubmit} className="login-form">
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
        <LogRegSwitcher
          setFormType={setFormType}
          formType={formType}
          onClick={() => toLogIn()}
        />

        <p className="text-container">{t("registerText")}</p>
        <div className="form-group">
          <label htmlFor="email">{t("email")}</label>
          <input
            type="email"
            placeholder={t("exEmail")}
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">{t("password")}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">{t("passwordConfirm")}</label>
          <input
            type="password"
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="form-button">
          Register
        </button>
      </form>
    </>
  );
};
