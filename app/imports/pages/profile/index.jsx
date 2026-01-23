import React, { useState, useEffect } from "react";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { useNavigate } from "react-router-dom";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import Profile from "./Profile";

export default () => {
  const navigate = useNavigate();
  const user = useTracker(() => Meteor.user());
  const [memberInfo, setMemberInfo] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
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

  const handleSubmit = async ({ name, mobile, birthyear }) => {
    try {
      await Meteor.callAsync("createOrUpdateProfile", { name, mobile, birthyear });
      navigate("/");
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  return (
    <>
      <TopBar />
      {memberInfo && (
        <Profile
          onSubmit={handleSubmit}
          initialName={memberInfo.member?.name || ""}
          initialMobile={memberInfo.member?.mobile || ""}
          initialBirthyear={memberInfo.member?.birthyear || ""}
        />
      )}
      <BottomNavigation />
    </>
  );
};
