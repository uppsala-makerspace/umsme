import React, { useState, useEffect, useMemo, useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import MembershipSelection from "./MembershipSelection";
import {
  calculateOptionAvailability,
  getInitialCheckboxState,
} from "./availabilityRules";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";
import { AppDataContext } from "/imports/context/AppDataContext";

export default function MembershipSelectionPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { memberInfo, loading: memberInfoLoading } = useContext(MemberInfoContext);
  const { paymentOptions, loading: appDataLoading } = useContext(AppDataContext);

  // Get Swish disabled status from public settings
  const swishSettings = Meteor.settings?.public?.swish;
  const swishDisabled = swishSettings?.disabled === true;
  const lang = i18n.language === "sv" ? "sv" : "en";
  const disabledMessage = swishDisabled
    ? (swishSettings?.disabledMessage?.[lang] || swishSettings?.disabledMessage?.en || t("paymentsDisabled"))
    : null;

  const [error, setError] = useState(null);
  const [isDiscounted, setIsDiscounted] = useState(false);
  const [isFamily, setIsFamily] = useState(false);
  const [checkboxInitialized, setCheckboxInitialized] = useState(false);

  const member = memberInfo?.member || null;
  const memberStatus = memberInfo?.status || null;
  const isLoading = memberInfoLoading || appDataLoading || !paymentOptions;

  // Initialize checkbox state from memberStatus (only once after loading)
  useEffect(() => {
    if (memberStatus && !checkboxInitialized) {
      const initial = getInitialCheckboxState(memberStatus);
      setIsFamily(initial.isFamily);
      setIsDiscounted(initial.isDiscounted);
      setCheckboxInitialized(true);
    }
  }, [memberStatus, checkboxInitialized]);

  // Compute checkbox lock state
  const checkboxState = useMemo(() => {
    return getInitialCheckboxState(memberStatus);
  }, [memberStatus]);

  // Compute options with availability rules applied
  const optionsWithAvailability = useMemo(() => {
    return calculateOptionAvailability(
      paymentOptions || [],
      memberStatus,
      isFamily
    );
  }, [paymentOptions, memberStatus, isFamily]);

  const handleSelectOption = (option) => {
    navigate(`/paymentSelection/${option.paymentType}`);
  };

  const handleFamilyChange = (checked) => {
    if (checkboxState.familyLocked) return;
    setIsFamily(checked);
    if (checked) setIsDiscounted(false);
  };

  const handleCancel = () => {
    navigate("/");
  };

  // Redirect if not logged in
  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <MembershipSelection
        loading={isLoading}
        error={error}
        member={member}
        memberStatus={memberStatus}
        options={optionsWithAvailability}
        isDiscounted={isDiscounted}
        isFamily={isFamily}
        isFamilyMember={!!member?.infamily}
        familyLocked={checkboxState.familyLocked}
        disabledMessage={disabledMessage}
        onSelectOption={handleSelectOption}
        onDiscountedChange={setIsDiscounted}
        onFamilyChange={handleFamilyChange}
        onCancel={handleCancel}
      />
    </Layout>
  );
}
