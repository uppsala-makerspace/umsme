import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "../../components/HamburgerMenu/HamburgerMenu";
import { AddFamilyMember } from "../addFamilyMember";
import { useTranslation } from "react-i18next";
import "./acounts.css";
//import "../../components/LogoutButton/LogoutButtons.css";
import { LogoutButton } from "../../components/LogoutButton/LogoutButtons.jsx";

export const accounts = () => {
  const user = useTracker(() => Meteor.user());
  const { t, i18n } = useTranslation();
  const [member, setMember] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [family, setFamily] = useState([]);
  const [addingFamilyMember, setAddingFamilyMember] = useState(false);
  const [isFamilyHead, setisFamilyHead] = useState(false);
  const [familyHeadMembership, setFamilyHeadMembership] = useState(null);
  const [isInFamily, setIsInFamily] = useState(false);
  const [familySize, setFamilySize] = useState(0);

  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      if (user) {
        try {
          const {
            member: m,
            memberships: ms,
            familyMembers: fm,
            familyHeadMembership: fmh,
          } = await Meteor.callAsync("findInfoForUser");
          setIsLoading(false);
          setFamilySize(fm.length);
          if (fmh && fmh.mid === m._id) {
            setisFamilyHead(true);
            const email = fm.map((member) => member.email);
            setFamily(email);
          } else if (fmh) {
            setFamilyHeadMembership(fmh);
            const email = fm.map((member) => member.email);
            setFamily(email);
          }

          if (m) {
            setMember(m);
            console.log("m:", m);
            setMemberships(ms);
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

  useEffect(() => {
    if (member && member.infamily) {
      console.log("Medlem är i familj med ID:", member.infamily);
      setIsInFamily(true);
    }
  }, [member]);

  console.log("membership", memberships);
  console.log("currentMember", member);
  console.log("familj", family);

  const openFamilyForm = () => {
    FlowRouter.go("/addFamilyMember");
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

  const membershipTypeName = () => {
    if (memberships?.[0]?.family === true) {
      return t("memberFamily");
    }
    if (memberships?.[0]?.type === "labandmember") {
      //for old members we did this was callled "Individual lab member", this new name wont work for them

      return t("memberIndivdual");
    }
    if (memberships?.[0]?.type === "member") {
      return t("memberBase");
    }
  };
  console.log(isFamilyHead);
  //const member_family = member.family;
  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <div>
        <div className="login-form">
          <button className="round-prof">
            <a href="/profile" className="profile-link">
              {t("AddPic")}
            </a>
          </button>

          <button className="login-form"> {member?.name}</button>

          <h1 className="middle-text"> {t("MyAccount")}</h1>

          {/*  {member_family ? <span>{t("FamilyMember")}</span> : null} */}

          <div className="middle-text">
            {t("TypeOfMembership")}{" "}
            {isInFamily ? t("memberFamily") : membershipTypeName()}
          </div>

          <div className="middle-text">
            {t("MemberID")} {member?.mid || "–"}
          </div>
          <br />
          <div className="middle-text">
            {t("MemberSince")}{" "}
            {memberships?.[
              memberships.length - 1
            ]?.start.toLocaleDateString() ||
              familyHeadMembership?.start.toLocaleDateString() ||
              "–"}
          </div>
          <div className="middle-text">
            {t("EndDate")}{" "}
            {memberships?.[0]?.memberend.toLocaleDateString() ||
              familyHeadMembership?.memberend.toLocaleDateString() ||
              "-"}
          </div>

          <br />

          <div className="middle-text">
            {family.length >= 1 ? (
              <div>
                <div>{t("FamilyMembers")}</div>

                <div className="vertical-divider">
                  {family.map((email, index) => (
                    <div key={index} className="family-row">
                      <span className="family-email">{email}</span>

                      {isFamilyHead && (
                        <a href="/profile" className="remove-link">
                          {t("Remove")}
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <br />
              </div>
            ) : (
              <div></div>
            )}
            {isFamilyHead && familySize < 4 ? (
              <div login-form>
                <button
                  style={{ width: "86vw" }}
                  className="finishButton"
                  onClick={openFamilyForm}
                >
                  {t("AddFamilyMember")}
                </button>
              </div>
            ) : (
              <div></div>
            )}
          </div>
          <br />
          <LogoutButton onClick={logout} />
        </div>
      </div>
    </>
  );
};
