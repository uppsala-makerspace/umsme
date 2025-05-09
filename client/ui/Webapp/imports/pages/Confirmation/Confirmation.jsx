import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { useTranslation } from "react-i18next";
import "./Confirmation.css";

export const Confirmation = () => {
  const user = useTracker(() => Meteor.user());

  const [membershipType, setMembershipType] = useState(null);
  const { t } = useTranslation();

  return (
    <div className="confirmation-container">
      <h1>Test: Confirmation Page</h1>
    </div>
  );
};
