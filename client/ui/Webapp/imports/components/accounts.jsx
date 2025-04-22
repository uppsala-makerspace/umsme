import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { HamburgerMenu } from "./HamburgerMenu";
import { useTranslation } from "react-i18next";

export const accounts = () => {
  const user = useTracker(() => Meteor.user());
  const { t, i18n } = useTranslation();
  const [member, setMember] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [family, setFamily] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      if (user) {
        try {
          const {
            member: m,
            memberships: ms,
            familyMembers: fm,
          } = await Meteor.callAsync("findInfoForUser");
          setIsLoading(false);

          if (m) {
            setMember(m);
            setMemberships(ms);
            const email = fm.map((member) => member.email);
            setFamily(email);
          } else {
            // Om användaren inte är medlem
            console.log("Användaren är inte medlem.");
            setMember(null);
            setMemberships([]);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };

    fetchData();
  }, [user?._id]);

  console.log("membership", memberships);
  console.log("currentMember", member);
  console.log("familj", family);

  const membershipType = () => {
    if (memberships?.[0]?.amount >= 2000) {
      return "Labbmedlem Familj";
    }
    if (memberships?.[0]?.amount === 1200) {
      return "Labbmedlem";
    }
    if (memberships?.[0]?.amount === 200) {
      return "Medlemskap Bas";
    }
  };

  const isFamilyMember = () => {
    if (membershipType() === "Labbmedlem Familj") {
      return true;
    }
  };

  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      } else {
        FlowRouter.go("/login");
      }
    });
  };

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />

      <div className="login-form">
        <button className="round-prof"></button>
        <a href="/profile" className="profile-link">
          {t("ViewProfile")}
        </a>
        <button className="login-form"> {member?.name}</button>

        <h1> {t("MyAccount")}</h1>

        <div>
          {t("TypeOfMembership")} {membershipType()}
        </div>

        <div>
          {t("MemberID")} {member?.mid || "–"}
        </div>
        <br />
        <div>
          {t("MemberSince")}{" "}
          {memberships?.[memberships.length - 1]?.start.toLocaleDateString() ||
            "–"}
        </div>
        <div>
          {t("EndDate")}{" "}
          {memberships?.[0]?.memberend.toLocaleDateString() || "–"}
        </div>
        <br />

        <div>
          {isFamilyMember() ? (
            <div>
              <div>{t("FamilyMembers")}</div>
              <ul>
                {family.map((email, index) => (
                  <li key={index}>{email}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div></div>
          )}
        </div>
      </div>
      <button onClick={logout}>{t("logout")}</button>
    </>
  );
};
