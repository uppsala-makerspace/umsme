import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { HamburgerMenu } from "./HamburgerMenu";
import { Members } from "/collections/members.js";
import { Memberships } from "/collections/memberships";
import { useTracker } from "meteor/react-meteor-data";

export const LoggedInAsMember = () => {
  const user = useTracker(() => Meteor.user());
  const [memberLab, setMemberLab] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [member, setMember] = useState({});

  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      if (user) {
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
            setMemberLab(null);
            setMemberships([]);
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
    FlowRouter.go("HandleMembership");
  };

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <div className="login-form">
        <button className="round-button">M</button>
        <h3>Hejsan!</h3>
        <p>Du är inloggad som medlem.</p>
        {typeof daysLeftOfLab === "number" &&
          daysLeftOfLab >= 0 &&
          daysLeftOfLab < 8 && (
            <div>
              <p>
                Psst - ditt labbmedlemskap behöver förnyas inom {daysLeftOfLab}{" "}
                dagar!
              </p>
              <button className="form-button" onClick={goToHandleMembership}>
                Förnya medlemsskap
              </button>
            </div>
          )}

        <button onClick={logout}>Logga ut</button>
      </div>
    </>
  );
};
