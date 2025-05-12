import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "../components/LanguageSwitcher/langueSwitcher";
import { useTranslation } from "react-i18next";
import { PendingMembers } from "/collections/PendingMembers.js";
import PushSetup from "../components/pushSetup";
import { FiAlignCenter } from "react-icons/fi";
import { LogoutButton } from "../components/LogoutButton/LogoutButtons.jsx";

export const LoggedIn = () => {
  const { t, i18n } = useTranslation();
  const user = useTracker(() => Meteor.user());

  const [member, setMember] = useState(false);
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [family, setFamily] = useState([]);

  const email = user?.emails?.[0]?.address || "Ingen e-postadress hittades";

  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      if (user._id) {
        try {
          const {
            member: m,
            memberships: ms,
            familyHeadMembership: fhm,
          } = await Meteor.callAsync("findInfoForUser");
          console.log("memberships:", ms);
          console.log("memberrrr:", m);
          console.log("familyhead", fhm);
          setIsLoading(false);
          console.log("m:", m);
          if (m) {
            console.log("Användaren är medlem.");
            setMember(true);
            if (fhm && fhm.memberend >= new Date()) {
              console.log("fhm.memberend:", fhm.memberend);
              //If the paying member of the fmaily has an active family membership, the children may also access the LoggedInAsMember page
              FlowRouter.go("LoggedInAsMember");
            }

            if (m && ms[0].memberend >= new Date()) {
              if (FlowRouter.current().route.name !== "LoggedInAsMember") {
                FlowRouter.go("LoggedInAsMember");
              }
            }
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };

    fetchData();
  }, [user?._id]);

  useEffect(() => {
    const checkPending = async () => {
      try {
        const isPending = await Meteor.callAsync("findPendingMemberForUser");
        if (isPending) {
          console.log("✅ Användaren finns i pendingMembers.");
          // Exempel: redirecta om du vill
          // FlowRouter.go("/waitingApproval");
          Meteor.call(
            "createMemberFromPending",
            user.emails[0].address,
            (err, res) => {
              if (err) {
                console.error("❌ Kunde inte skapa medlem från pending:", err);
              } else {
                console.log("✅ Medlem skapad:", res);
                FlowRouter.go("/loggedInAsMember");
              }
            }
          );
        } else {
          console.log("❌ Användaren finns inte i pendingMembers.");
        }
      } catch (error) {
        console.error("🚨 Fel vid anrop till findPendingMemberForUser:", error);
      }
    };

    checkPending();
  }, []);

  if (isLoading) {
    return <div>Loading member information...</div>;
  }

  // Not correct, sort and find the correct latest membership.
  const currentMembership = memberships.length > 0 ? memberships[0] : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (member) {
      FlowRouter.go("HandleMembership");
    } else {
      FlowRouter.go("/createMember");
    }
  };

  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      } else {
        FlowRouter.go("/login");
      }
    });
  };

  return (
    <>
      <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
      <LanguageSwitcher />
      <div className="login-form">
        <PushSetup />
        <div>
          <h3 className="text-h3"> {t("welcome")}</h3>
          {member ? (
            <>
              <p className="text-container">{t("noMembershiptext1")}</p>
              <p className="text-container">{t("noMembershiptext2")}</p>
            </>
          ) : (
            <>
              <p className="text-container">{t("noMembertext1")}</p>
              <p className="text-container">{t("noMembertext2")}</p>
            </>
          )}
        </div>
        {member ? (
          <button type="submit" className="form-button" onClick={handleSubmit}>
            {t("getMembership")}
          </button>
        ) : (
          <button type="submit" className="form-button" onClick={handleSubmit}>
            {t("becomeMember")}
          </button>
        )}

        <p style={{ textAlign: "center" }}>
          {t("yourMail")} {email}
        </p>
        {/*
        <button
          onClick={() =>
            Meteor.callAsync("sendPush", "Hej!", "Det här är en testnotis")
          }
        >
          Skicka testnotis
        </button>
        */}

        <LogoutButton onClick={logout} />
      </div>
    </>
  );
};
