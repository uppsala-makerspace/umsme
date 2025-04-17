import React from "react";
import { Meteor } from "meteor/meteor";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "../langueSwitcher";
import { HamburgerMenu } from "../HamburgerMenu";
import { useState } from "react";
import {t} from "i18next";
import "./contacts.css";


export const contact = () => {
    const user = Meteor.userId();

    const [result, setResult] = React.useState("");

    const handleSubmit = async (e) => {
      e.preventDefault();
      setResult("Sending....");

      const formData = new FormData(e.target);
  
      formData.append("access_key", "f4c319c4-87ab-4c99-bf41-424dc1ed99bd");  // Replace with another key upon deployment
  
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });
  
      const data = await response.json();
  
      if (data.success) {
        setResult("Form Submitted Successfully");
        e.target.reset();
      } else {
        console.log("Error", data);
        setResult(data.message);
      }
    };

    return (
        <>
        <LanguageSwitcher />
        <HamburgerMenu />
        <div className="login-form">
            <h1>{t("contactUs")}</h1>
            <form onSubmit={handleSubmit}> 
                <div>
                    <label htmlFor="name">{t("Name")}</label>
                    <input type="text" id="name" name="name" required />
                </div>
                <div>
                    <label htmlFor="email">{t("email")}</label>
                    <input type="email" id="email" name="email" required />
                </div>
                <div>
                    <label htmlFor="message">{t("Message")}</label>
                    <textarea id="message" name="message" required className="text-area"></textarea>
                </div>
                <button type="submit" className="submit-button">{t("Send")}</button>
            </form>
            {result==="Form Submitted Successfully" && (
              <p className="form-submitted">{t("SentForm")}</p>)}

            <p>{t("WriteSlack")}</p>
            <a href="https://app.slack.com/client/T29LX7K7C/C29LE8ZTQ"> {t("PressSlack")}</a>

        </div>
        </>
    )
}