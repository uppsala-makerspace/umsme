import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { HamburgerMenu } from "./HamburgerMenu";
import { t } from "i18next";

export const accounts = () => {
  const user = useTracker(() => Meteor.user());
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
      <div className="login-form">
        <div>
          <LanguageSwitcher />
          <HamburgerMenu />
        </div>
        <h1> {t("MyAccount")}</h1>
        <div> {member?.name}</div>
        <div>{t("TypeOfMembership")} {membershipType()}</div>
        <div>
          {t("MemberSince")}{" "}
          {memberships?.[memberships.length - 1]?.start.toLocaleDateString() ||
            "–"}
        </div>
        <div>
          {t("EndDate")} {memberships?.[0]?.memberend.toLocaleDateString() || "–"}
        </div>
        <div>
          {isFamilyMember() ? (
            <div>
              <div>{t("FamilyMembers")}</div>
            </div>
          ) : (
            <div></div>
          )}
        </div>
      </div>
      <p>{family.join(", ")}</p>
      <button onClick={logout}>{t("logout")}</button>
    </>
  );
};
