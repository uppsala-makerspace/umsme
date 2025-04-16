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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const { member: m, memberships: ms } = await Meteor.callAsync(
            "findInfoForUser"
          );
          setIsLoading(false);

          if (m && ms[0].memberend >= new Date()) {
            if (FlowRouter.current().route.name !== "LoggedInAsMember") {
              FlowRouter.go("LoggedInAsMember");
            }
          } else {
            // Om användaren inte är medlem
            console.log("Användaren är inte medlem.");
            setMember(null);
            setMemberships([]);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      } else {
      }
    };

    fetchData();
  }, [user]);

  if (isLoading) {
    return <div>Loading member information...</div>;
  }

  const email = user?.emails?.[0]?.address || "Ingen e-postadress hittades";

  // Not correct, sort and find the correct latest membership.
  const currentMembership = memberships.length > 0 ? memberships[0] : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    FlowRouter.go("HandleMembership");
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
