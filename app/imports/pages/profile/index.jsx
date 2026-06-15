import React, { useContext } from "react";
import { Meteor } from "meteor/meteor";
import { useNavigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Profile from "./Profile";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";

export default () => {
  const navigate = useNavigate();
  const { memberInfo, refetch } = useContext(MemberInfoContext);

  const handleSubmit = async (payload) => {
    try {
      await Meteor.callAsync("createOrUpdateProfile", payload);
      await refetch();
      navigate("/");
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  const hasMember = !!memberInfo?.member?.name;

  return (
    <Layout bottomNav={hasMember} showNotifications={hasMember}>
      {memberInfo?.verified !== undefined && (
        <Profile
          key={memberInfo.member?._id || "new"}
          onSubmit={handleSubmit}
          showBank={!!memberInfo?.expensesAllowed}
          initialName={memberInfo.member?.name || ""}
          initialMobile={memberInfo.member?.mobile || ""}
          initialBirthyear={memberInfo.member?.birthyear || ""}
          initialGender={memberInfo.member?.gender || ""}
          initialRfid={memberInfo.member?.rfid || ""}
          initialBankName={memberInfo.member?.bankName || ""}
          initialBankClearing={memberInfo.member?.bankClearing || ""}
          initialBankAccountNumber={memberInfo.member?.bankAccountNumber || ""}
          initialBankAccountHolder={memberInfo.member?.bankAccountHolder || ""}
        />
      )}
    </Layout>
  );
};
