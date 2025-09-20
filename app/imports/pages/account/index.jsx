import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "../../components/HamburgerMenu/HamburgerMenu";
import LogoutButton from "/imports/components/LogoutButton";
import Account from "./Account";

export default () => {
  const user = useTracker(() => Meteor.user());
  const [memberInfo, setMemberInfo] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      if (user) {
        try {
          const info = await Meteor.callAsync("findInfoForUser");
          setMemberInfo(info);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };
    fetchData();
  }, [user?._id]);

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <div className="login-form">
        {memberInfo && (
          <Account memberInfo={memberInfo}></Account>
        )}
        <br />
        <LogoutButton />
      </div>
    </>
  );
};
