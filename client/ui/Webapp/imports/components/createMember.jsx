import React, { useState } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { LogRegSwitcher } from "./LogRegSwitcher";
import { useTranslation } from "react-i18next";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { models } from "/lib/models"; // to access maxlengths for name and mobile dynamically

export const createMember = () => {
  const user = useTracker(() => Meteor.user(), []);

  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [youth, setYouth] = useState(false);

  const nameMaxLength = models.member.name.max;
  const mobileMaxLength = models.member.mobile.max;

  const handleSubmit = (e) => {
    e.preventDefault();
    Meteor.call(
      "savePendingMember",
      {
        email: user.emails[0].address,
        name,
        mobile,
        youth,
      },
      (err) => {
        if (err) {
          console.error("Kunde inte spara pendingMember:", err);
        } else {
          console.log("pendingMember sparad");
        }
      }
    );
    Meteor.call(
      "createMemberFromPending",
      user.emails[0].address,
      (err, res) => {
        if (err) {
          console.error(" Kunde inte skapa medlem från pending:", err);
        } else {
          console.log(" Medlem skapad:", res);
          FlowRouter.go("/loggedIn");
        }
      }
    );
    // FlowRouter.go("/LoggedIn");
  };

  const toLogIn = () => {
    FlowRouter.go("/login");
  };

  return (
    <>
      <LanguageSwitcher />
      <form onSubmit={handleSubmit} className="login-form">
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />

        <p className="text-container">{t("registerText")}</p>

        <div className="form-group">
          <label htmlFor="name">{t("Name")}</label>
          <input
            type="text"
            id="name"
            placeholder={t("names")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={nameMaxLength}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="mobile">{t("number")}</label>
          <input
            type="tel"
            id="mobile"
            placeholder="0701234567"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            maxLength={mobileMaxLength}
            required
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={youth}
              onChange={() => setYouth(!youth)}
            />
            {t("youth")}
          </label>
        </div>

        <button type="submit" className="form-button">
          {t("register")}
        </button>
      </form>
    </>
  );
};
