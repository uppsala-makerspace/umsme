import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "../components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "../components/HamburgerMenu/HamburgerMenu";
import { useTranslation } from "react-i18next";
import { useTracker } from "meteor/react-meteor-data";
import LogoutButton from "../components/LogoutButton/LogoutButtons.jsx";
import { Link } from 'react-router-dom';

//import PushSetup from "../components/pushSetup";

export default () => {
  const user = useTracker(() => Meteor.user());
  const { t, i18n } = useTranslation();
  const [memberLab, setMemberLab] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [member, setMember] = useState({ name: "" });
  const [memberend, setMemberEnd] = useState({});

/*  useEffect(() => {
    const color = "#f0efef";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);
  }, []);*/

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
            setMemberEnd(ms[0].memberend);
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const today = new Date();
  let daysLeftOfLab = null;
  if (memberend instanceof Date && !isNaN(memberend.getTime())) {
    console.log("Det är ett giltigt Date-objekt");
    daysLeftOfLab = Math.floor(
      (memberend.getTime() - today.getTime()) / msPerDay
    );
  }

  const timeToRenew = typeof daysLeftOfLab === "number" &&
    daysLeftOfLab >= 0 && daysLeftOfLab < 8;

  return (
    <>
      {!Meteor.userId() ? <Navigate to="/login" /> : null}
      <LanguageSwitcher />
      <HamburgerMenu />
      <div className="login-form">
        <button
          onClick={() => FlowRouter.go("/LoggedInAsMember/keys")}
          className="round-button"
        ></button>
        <div style={{ marginTop: "10px" }}>
          {t("greeting2")} {member?.name?.split(" ")[0]}!
        </div>
        <div style={{ marginTop: "0" }}> {t("PressToOpen")}</div>
        {timeToRenew && (
            <div>
              <p style={{ textAlign: "center" }}>
                {t("AlertEndDate")}
                {daysLeftOfLab} {t("days")}
              </p>

              <Link to="/LoggedInAsMember/HandleMembership" className="wideButton">
                <button className="form-button">{t("RenewMembership")}</button>
              </Link>
            </div>
          )}
        <LogoutButton />
      </div>

    </>
  );
  //      <PushSetup />
};
