import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import LogoutButton from "/imports/components/LogoutButton";
import { Navigate } from 'react-router-dom';
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
