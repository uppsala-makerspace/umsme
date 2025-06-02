import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "../components/LanguageSwitcher/langueSwitcher";
import { useTranslation } from "react-i18next";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { models } from "/lib/models"; // to access maxlengths for name and mobile dynamically
import { HamburgerMenu } from "../components/HamburgerMenu/HamburgerMenu";

export const AddFamilyMember = () => {
  const user = useTracker(() => Meteor.user(), []);

  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [youth, setYouth] = useState(false);
  const [email, setEmail] = useState("");
  const [member, setMember] = useState(null);
  const [familySize, setFamilySize] = useState(0);

  const nameMaxLength = models.member.name.max;
  const mobileMaxLength = models.member.mobile.max;

  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      if (user) {
        try {
          const { member: m, familyMembers: fm } = await Meteor.callAsync(
            "findInfoForUser"
          );
          console.log("familyMembers:", fm);
          console.log("family size:", fm.length);
          setFamilySize(fm.length);

          if (m) {
            setMember(m);
          } else {
            // Om användaren inte är medlem

            setMember(null);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };

    fetchData();
  }, [user?._id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (familySize > 3) {
      alert(
        "Du kan inte lägga till fler än 5 familjemedlemmar, make this a label."
      );
      return;
    }
    Meteor.call(
      "savePendingMember",
      {
        email,
        name,
        mobile,
        youth,
        infamily: member.mid, // Set infamily to the current member's mid, note that infamily is an ID
        family: true,
      },
      (err) => {
        if (err) {
          console.error("Kunde inte spara pendingMember:", err);
        } else {
          console.log("pendingMember sparad");
        }
      }
    );
    FlowRouter.go("/LoggedInAsMember/accounts");
  };

  const toLogIn = () => {
    FlowRouter.go("/login");
  };

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <form onSubmit={handleSubmit} className="login-form">
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />

        <p className="text-container">{t("registerFamilyMember")}</p>

        <div className="form-group">
          <label htmlFor="name">{t("name")}</label>
          <input
            type="text"
            id="name"
            placeholder="För- och efternamn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={nameMaxLength}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">{t("email")}</label>
          <input
            type="email"
            id="email"
            placeholder={t("exEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="mobile">{t("mobile")}</label>
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
            Ungdom (under 26 år)
          </label>
        </div>

        <button type="submit" className="form-button">
          {t("register")}
        </button>
      </form>
    </>
  );
};
