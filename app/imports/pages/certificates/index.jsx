import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "../../components/HamburgerMenu/HamburgerMenu";
import BottomNavigation from "/imports/components/BottomNavigation";
import Certificates from "./Certificates.jsx";

export default () => {
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [myAttestations, setMyAttestations] = useState([]);
  const [isCertifier, setIsCertifier] = useState(false);
  const [pendingToConfirm, setPendingToConfirm] = useState([]);
  const [recentlyConfirmed, setRecentlyConfirmed] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [allCerts, myAtts, certifierData] = await Promise.all([
        Meteor.callAsync("certificates.getAll"),
        Meteor.callAsync("certificates.getMyAttestations"),
        Meteor.callAsync("certificates.getPendingToConfirm"),
      ]);
      setCertificates(allCerts);
      setMyAttestations(myAtts);

      // certifierData is null if user is not a certifier, array if they are
      if (certifierData === null) {
        setIsCertifier(false);
        setPendingToConfirm([]);
        setRecentlyConfirmed([]);
      } else {
        setIsCertifier(true);
        // Separate pending from recently confirmed
        const pending = certifierData.filter((att) => !att.isConfirmed);
        const confirmed = certifierData
          .filter((att) => att.isConfirmed)
          .sort((a, b) => new Date(b.confirmedAt) - new Date(a.confirmedAt));
        setPendingToConfirm(pending);
        setRecentlyConfirmed(confirmed);
      }
    } catch (error) {
      console.error("Error fetching certificate data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <Certificates
        loading={loading}
        certificates={certificates}
        myAttestations={myAttestations}
        isCertifier={isCertifier}
        pendingToConfirm={pendingToConfirm}
        recentlyConfirmed={recentlyConfirmed}
      />
      <BottomNavigation />
    </>
  );
};
