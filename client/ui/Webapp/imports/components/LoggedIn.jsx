import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "./langueSwitcher";
import { useTranslation } from "react-i18next";

export const LoggedIn = () => {
  const { t, i18n } = useTranslation();
  const user = useTracker(() => Meteor.user());

  const [member, setMember] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [family, setFamily] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      if (user._id) {
        try {
          const {
            member: m,
            memberships: ms,
            familyHead: fmh,
          } = await Meteor.callAsync("findInfoForUser");
          console.log("memberships:", ms);
          console.log("memberrrr:", m);
          console.log("familyhead", fmh);
          setIsLoading(false);
          if (fmh && fmh.memberend >= new Date()) {
            //If the paying member of the fmaily has an active family membership, the children may also access the LoggedInAsMember page
            FlowRouter.go("LoggedInAsMember");
          }

          if (m && ms[0].memberend >= new Date()) {
            if (FlowRouter.current().route.name !== "LoggedInAsMember") {
              FlowRouter.go("LoggedInAsMember");
            }
          } else {
            // Om användaren inte är medlem
            console.log("Användaren är inte medlem.");
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };

    fetchData();
  }, [user?._id]);

  if (isLoading) {
    return <div>Loading member information...</div>;
  }

  const email = user?.emails?.[0]?.address || "Ingen e-postadress hittades";

  // Not correct, sort and find the correct latest membership.
  const currentMembership = memberships.length > 0 ? memberships[0] : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    FlowRouter.go("/LoggedInAsMember/HandleMembership");
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
      <form className="login-form">
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo" />
        <LanguageSwitcher />
        <div>
          <h3 className="text-h3"> {t("welcome")}</h3>
          <p className="text-container">{t("noMembertext1")}</p>
          <p className="text-container">{t("noMembertext2")}</p>
        </div>
        <button type="submit" className="form-button" onClick={handleSubmit}>
          {t("becomeMember")}
        </button>
      </form>
      <p>Din e-postadress: {email}</p>
      <button onClick={logout}>Logout</button>
    </>
  );
};
