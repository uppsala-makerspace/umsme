import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import { useTranslation } from "react-i18next";
import { PendingMembers } from "/imports/common/collections/PendingMembers.js";
import LogoutButton from "/imports/components/LogoutButton";
import { Navigate, Link } from 'react-router-dom';
import { HamburgerMenu } from "../components/HamburgerMenu/HamburgerMenu";

const msPerDay = 1000 * 60 * 60 * 24;

/** This view is used if there is no member or no active membership. */
export default () => {
  const { t } = useTranslation();
  const user = useTracker(() => Meteor.user());

  const [member, setMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const activeMembership = status && status.memberEnd >= new Date();

  // Load member information
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const {
          member: m,
          status: mstatus,
        } = await Meteor.callAsync("findInfoForUser");
        setIsLoading(false);
        if (m) {
          console.log("Användaren är medlem.");
          setMember(true);
          setMemberName(m.name);
          setStatus(mstatus);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [user?._id]);

  // Load pending member and update
  useEffect(() => {
    const fetchData = async () => {
      try {
        const isPending = await Meteor.callAsync("findPendingMemberForUser");
        if (isPending) {
          console.log("Användaren finns i pendingMembers.");
          // FlowRouter.go("/waitingApproval");
          Meteor.call(
            "createMemberFromPending",
            user.emails[0].address,
            (err, res) => {
              if (err) {
                console.error(" Kunde inte skapa medlem från pending:", err);
              }
            }
          );
        } else {
          console.log("Användaren finns inte i pendingMembers.");
        }
      } catch (error) {
        console.error("Fel vid anrop till findPendingMemberForUser:", error);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <div>Loading member information...</div>;
  }

  let daysLeftOfLab = null;
  if (status) {
    const today = new Date();
    daysLeftOfLab = Math.floor(
      (status.labEnd || status.memberEnd).getTime() - today.getTime()) / msPerDay;
  }
  const timeToRenew = typeof daysLeftOfLab === "number" &&
    daysLeftOfLab >= 0 && daysLeftOfLab < 8;

  const name = memberName?.split(" ")[0];

  return (
    <>
      {!Meteor.userId() ? <Navigate to="/login" /> : null}
      <LanguageSwitcher />
      <HamburgerMenu />
      {activeMembership ? (
        <div className="login-form">
          <Link to="/LoggedInAsMember/keys" style={{width: "100%", "text-align": "center"}}>
            <button className="round-button"></button>
          </Link>
          <h3 className="text-h3">{t("greeting2")} {name}!</h3>
          <div style={{ marginTop: "0" }}> {t("PressToOpen")}</div>
          {timeToRenew && (
            <div>
              <p style={{ textAlign: "center" }}>
                {t("AlertEndDate")}
                {daysLeftOfLab.toFixed(0)} {t("days")}
              </p>

              <Link to="/LoggedInAsMember/HandleMembership" className="wideButton">
                <button className="form-button">{t("RenewMembership")}</button>
              </Link>
            </div>
          )}
          <LogoutButton />
        </div>
      ) : (
        <>
          <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
          <div className="login-form">
            <h3 className="text-h3">{t("welcome")} {name}!</h3>
            {member ? (
              <>
                <p className="text-container">{t("noMembershiptext1")}</p>
                <p className="text-container">{t("noMembershiptext2")}</p>
              </>
            ) : (
              <>
                <p className="text-container">{t("noMembertext1")}</p>
                <p className="text-container">{t("noMembertext2")}</p>
              </>
            )}
            {member ? (
              <Link to="/payment" className="wideButton">
                <button className="form-button">{t("getMembership")}</button>
              </Link>
            ) : (
              <Link to="/createMember" className="wideButton">
                <button className="form-button">{t("becomeMember")}</button>
              </Link>
            )}
            <br />
            <LogoutButton />
          </div>
        </>)}
    </>
  );
};
