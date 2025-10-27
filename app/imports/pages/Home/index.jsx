import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import { PendingMembers } from "/imports/common/collections/PendingMembers.js";
import LogoutButton from "/imports/components/LogoutButton";
import { Navigate, Link } from 'react-router-dom';
import { HamburgerMenu } from "/imports/components/HamburgerMenu/HamburgerMenu";
import Home from "./Home";

/** This view is used if there is no member or no active membership. */
export default () => {
  const user = useTracker(() => Meteor.user());

  const [memberName, setMemberName] = useState("");
  const [memberStatus, setMemberStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load member information
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const { member, status } = await Meteor.callAsync("findInfoForUser");
        setIsLoading(false);
        if (member) {
          console.log("The user has an associated member.");
          setMemberName(member.name);
          setMemberStatus(status);
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

  return <>
    {!Meteor.userId() ? <Navigate to="/login" /> : null}
    <LanguageSwitcher />
    <HamburgerMenu />
    <div className="login-form">
      <Home memberName={memberName} memberStatus={memberStatus}></Home>
      <br />
      <LogoutButton />
    </div>
  </>;
};
