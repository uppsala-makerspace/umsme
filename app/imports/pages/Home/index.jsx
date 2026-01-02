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
  const [memberInfo, setMemberInfo] = useState(null);

  // Load member information
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const info = await Meteor.callAsync("findInfoForUser");
        setMemberInfo(info);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [user?._id]);

  return <>
    {!Meteor.userId() ? <Navigate to="/login" /> : null}
    <LanguageSwitcher />
    <HamburgerMenu />
    <div className="login-form">
      <Home
        memberName={memberInfo?.member?.name || ""}
        memberStatus={memberInfo?.status}
        verified={memberInfo?.verified ?? false}
      />
      <br />
      <LogoutButton />
    </div>
  </>;
};
