import React, { useContext } from "react";
import { Meteor } from "meteor/meteor";
import { useNavigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Profile from "./Profile";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";

export default () => {
  const navigate = useNavigate();
  const { memberInfo, refetch } = useContext(MemberInfoContext);

  const handleSubmit = async ({ name, mobile, birthyear, gender, rfid }) => {
    try {
      await Meteor.callAsync("createOrUpdateProfile", { name, mobile, birthyear, gender, rfid });
      await refetch();
      navigate("/");
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  const hasMember = !!memberInfo?.member?.name;

  return (
    <Layout bottomNav={hasMember} showNotifications={hasMember}>
      {memberInfo && (
        <Profile
          key={memberInfo.member?._id || "new"}
          onSubmit={handleSubmit}
          initialName={memberInfo.member?.name || ""}
          initialMobile={memberInfo.member?.mobile || ""}
          initialBirthyear={memberInfo.member?.birthyear || ""}
          initialGender={memberInfo.member?.gender || ""}
          initialRfid={memberInfo.member?.rfid || ""}
        />
      )}
    </Layout>
  );
};
