import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { HamburgerMenu } from "./HamburgerMenu";
import { useTranslation } from "react-i18next";
import { useTracker } from "meteor/react-meteor-data";

export const LoggedInAsMember = () => {
  const user = useTracker(() => Meteor.user());
  const { t, i18n } = useTranslation();
  const [memberLab, setMemberLab] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [member, setMember] = useState({});

  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      if (user._id) {
        try {
          const { member: m, memberships: ms } = await Meteor.callAsync(
            "findInfoForUser"
          );
          setIsLoading(false);

          if (m) {
            setMemberLab(m.lab);
            setMemberships(ms);
            setMember(m);
          } else {
            // Om användaren inte är medlem
            console.log("Användaren är inte medlem.");
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };

    fetchData();
  }, [user?._id]);

  console.log("memberships:", memberships);
  console.log("member.lab:", memberLab);
  if (memberLab instanceof Date) {
    console.log("Det är ett Date-objekt");
  } else {
    console.log("Det är inte ett Date-objekt");
  }
  console.log("member:", member);

  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      } else {
        FlowRouter.go("/login");
      }
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const msPerDay = 1000 * 60 * 60 * 24;

  const today = new Date();

  let daysLeftOfLab = null;
  if (memberLab instanceof Date && !isNaN(memberLab.getTime())) {
    console.log("Det är ett giltigt Date-objekt");
    daysLeftOfLab = Math.floor(
      (memberLab.getTime() - today.getTime()) / msPerDay
    );
  } else {
    console.log("Det är inte ett giltigt Date-objekt");
  }

  const goToHandleMembership = () => {
    FlowRouter.go("/LoggedInAsMember/HandleMembership");
  };

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <div className="login-form">
        <button  onClick={() => FlowRouter.go("/LoggedInAsMember/keys")} className="round-button">M</button>
        <p style={{marginTop: "10px"}}>{t("greeting2")}</p>
        <p style={{marginTop: "0"}}> {t("PressToOpen")}</p>
        {typeof daysLeftOfLab === "number" &&
          daysLeftOfLab >= 0 &&
          daysLeftOfLab < 8 && (
            <div>
              <p
                style={{
                  textAlign: "center", // <-- detta överskriver all CSS
                }}
              >
                {t("AlertEndDate")}
                {daysLeftOfLab} {t("days")}
              </p>

              <button
                className="login-form"
                style={{
                  color: "#f0efef",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: "#5FC86F", // <-- detta överskriver all CSS
                }}
                onClick={goToHandleMembership}
              >
                {t("RenewMembership")}
              </button>
              <br />
            </div>
          )}
        <button onClick={logout}>{t("logout")}</button>
      </div>
    </>
  );
};
