import React, { useState, useEffect, useMemo } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import MembershipSelection from "./MembershipSelection";
import {
  calculateOptionAvailability,
  getInitialCheckboxState,
} from "./availabilityRules";

export default function MembershipSelectionPage() {
  const { t } = useTranslation();
  const user = useTracker(() => Meteor.user());
  const navigate = useNavigate();

  const [paymentOptions, setPaymentOptions] = useState([]);
  const [memberInfo, setMemberInfo] = useState({
    member: null,
    memberStatus: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDiscounted, setIsDiscounted] = useState(false);
  const [isFamily, setIsFamily] = useState(false);
  const [checkboxInitialized, setCheckboxInitialized] = useState(false);

  // Load payment options configuration
  useEffect(() => {
    Meteor.callAsync("payment.getOptions")
      .then((data) => setPaymentOptions(data || []))
      .catch((err) => console.error("Failed to load payment options:", err));
  }, []);

  // Fetch member info
  useEffect(() => {
    if (!user) return;

    const fetchMemberInfo = async () => {
      try {
        setIsLoading(true);
        const result = await Meteor.callAsync("findInfoForUser");
        setMemberInfo({
          member: result.member,
          memberStatus: result.status,
        });
      } catch (err) {
        console.error("Error fetching member info:", err);
        setError(err.reason || err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberInfo();
  }, [user?._id]);

  // Initialize checkbox state from memberStatus (only once after loading)
  useEffect(() => {
    if (memberInfo.memberStatus && !checkboxInitialized) {
      const initial = getInitialCheckboxState(memberInfo.memberStatus);
      setIsFamily(initial.isFamily);
      setIsDiscounted(initial.isDiscounted);
      setCheckboxInitialized(true);
    }
  }, [memberInfo.memberStatus, checkboxInitialized]);

  // Compute checkbox lock state
  const checkboxState = useMemo(() => {
    return getInitialCheckboxState(memberInfo.memberStatus);
  }, [memberInfo.memberStatus]);

  // Compute options with availability rules applied
  const optionsWithAvailability = useMemo(() => {
    return calculateOptionAvailability(
      paymentOptions,
      memberInfo.memberStatus,
      isFamily
    );
  }, [paymentOptions, memberInfo.memberStatus, isFamily]);

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

  if (isLoading) {
    return (
      <>
        <TopBar />
        <div className="login-form">
          <div className="flex flex-col gap-4 items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
            <span>{t("loading")}</span>
          </div>
        </div>
        <BottomNavigation />
      </>
    );
  }

  if (error) {
    return (
      <>
        <TopBar />
        <div className="login-form">
          <div className="flex flex-col gap-4 items-center">
            <p className="text-red-500">{error}</p>
            <button className="form-button" onClick={() => navigate("/")}>
              {t("BackToStart")}
            </button>
          </div>
        </div>
        <BottomNavigation />
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="login-form">
        <MembershipSelection
          member={memberInfo.member}
          memberStatus={memberInfo.memberStatus}
          options={optionsWithAvailability}
          isDiscounted={isDiscounted}
          isFamily={isFamily}
          familyLocked={checkboxState.familyLocked}
          onSelectOption={handleSelectOption}
          onDiscountedChange={setIsDiscounted}
          onFamilyChange={handleFamilyChange}
          onCancel={handleCancel}
        />
      </div>
      <BottomNavigation />
    </>
  );
}
