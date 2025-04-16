import React, { useState, useEffect } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { LanguageSwitcher } from "./langueSwitcher";
import { HamburgerMenu } from "./HamburgerMenu";
import { Members } from "/collections/members.js";
import { Memberships } from "/collections/memberships";
import { useTracker } from "meteor/react-meteor-data";

export const LoggedInAsMember = () => {
  const user = useTracker(() => Meteor.user());
  const [member, setMember] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
            setMember(m);
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

  console.log("hej dåre");
  console.log("member:", member);
  console.log("memberships:", memberships);
  console.log("member.lab:", member);

  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      } else {
        FlowRouter.go("/login");
      }
    });
  };

  /*const { memberships, isMembershipsLoading } = useTracker(() => {
    const handle = Meteor.subscribe("memberships");
    return {
      memberships: Memberships.find().fetch(),
      isMembershipsLoading: !handle.ready(),
    };
  });

  const { members, isLoadingMembers } = useTracker(() => {
    const handle = Meteor.subscribe("members");
    return {
      members: Members.find().fetch(),
      isLoadingMembers: !handle.ready(),
    };
  });*/

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const email = user?.emails?.[0]?.address || "Ingen e-postadress hittades";

  const today = new Date();

  //I dont know if this is a problem but as you see I round down the date
  //Will memberships always run untill 02 am?

  //const daysLeftOfLab = Math.floor(
  //(member.lab - today.getTime()) / (1000 * 60 * 60 * 24)
  //);

  //console.log("curretnMember.lab:", currentMember.lab);
  //console.log("today:", today);
  //console.log("today.getTime():", today.getTime());
  // console.log("daysLeftOfLab:", daysLeftOfLab);

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
        {7 < 8 && (
          <div>
            <p>Psst - ditt labbmedlemskap behöver förnyas inom {4} dagar!</p>
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
