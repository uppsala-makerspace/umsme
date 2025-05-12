import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { useTranslation } from "react-i18next";
import "./Confirmation.css";

export const Confirmation = () => {
  const user = useTracker(() => Meteor.user());
  const [memberId, setMemberId] = useState(null);
  const [membershipType, setMembershipType] = useState(null);
  const [membershipEndDate, setMembershipEndDate] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!user?._id) return;

    const fetchData = async () => {
      try {
        const { member, memberships } = await Meteor.callAsync(
          "findInfoForUser"
        );

        if (member) {
          setMemberId(member._id);
          setMembershipEndDate(memberships[0]?.memberend);
        } else {
          console.log("Ingen medlemsdata hittades.");
        }
      } catch (error) {
        console.error("Error fetching membership data:", error);
      }
    };

    fetchData();
  }, [user?._id]);

  return (
    <div>
      <LanguageSwitcher />
      <div className="confirmation-container">
        <h1>{t("ThankYou")}</h1>
        <p>{t("MembershipRegistered")}</p>
        <p>
          {t("MembershipID")}: {memberId || t("Unknown")}
        </p>
        <p>
          {t("MembershipEndDate")}:{" "}
          {membershipEndDate
            ? new Date(membershipEndDate).toLocaleDateString()
            : t("Unknown")}
        </p>
        <button
          className="confirmation-button"
          onClick={() => FlowRouter.go("/")}
        >
          {t("BackToStart")}
        </button>
      </div>
    </div>
  );
};
