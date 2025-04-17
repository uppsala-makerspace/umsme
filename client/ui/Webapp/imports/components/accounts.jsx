import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { HamburgerMenu } from "./HamburgerMenu";
import { Members } from "/collections/members.js";
import { Memberships } from "/collections/memberships";

export const accounts = () => {
  const user = useTracker(() => Meteor.user());
  const [member, setMember] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState([]);

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
            setFamilyMembers(fm);
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
  console.log("familj", familyMembers);

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
        <h1> Mitt konto</h1>
        <div> {member?.name}</div>
        <div>Ditt medlemsskap: {membershipType()}</div>
        <div>
          Medlem sedan:{" "}
          {memberships?.[memberships.length - 1]?.start.toLocaleDateString() ||
            "–"}
        </div>
        <div>
          Slutdatum: {memberships?.[0]?.memberend.toLocaleDateString() || "–"}
        </div>
        <div>
          {isFamilyMember() ? (
            <div>
              <div>Familjemedlemmar: (upp till 4)</div>
            </div>
          ) : (
            <div></div>
          )}
        </div>
      </div>
      <button onClick={logout}>Logga ut</button>
    </>
  );
};
