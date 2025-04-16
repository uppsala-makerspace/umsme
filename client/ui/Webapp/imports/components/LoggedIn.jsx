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
  useEffect(async () => {
    if (user) {
      const {member: m, memberships: ms} = await Meteor.callAsync('findInfoForUser');
      setIsLoading(false);
      if (m) {
        setMember(m);
        setMemberships(ms);
      }
    }
  }, [user]);

/*  const { members, isLoadingMembers } = useTracker(() => {

    const handle = Meteor.subscribe("members");
    Meteor.subscribe("payments");

    return {
      members: Members.find().fetch(),
      isLoadingMembers: !handle.ready(),
    };
  });

  const { memberships, isMembershipsLoading } = useTracker(() => {
    const handle = Meteor.subscribe("memberships");
    return {
      memberships: Memberships.find().fetch(),
      isMembershipsLoading: !handle.ready(),
    };
  });
 */

  if (isLoading) {
    return <div>Loading member information...</div>;
  }

  const email = user?.emails?.[0]?.address || "Ingen e-postadress hittades";

/*  const isEmailInMembers = members.some((member) => member.email === email);

  const member =
    members.find((member) => member.email === email) || null;

  const membership = member
    ? memberships.find((membership) => membership.mid === member._id) ||
      null
    : null;

  if ( member && member.infamily) {
    const familyHead = members.find((m) => m._id === member.infamily);
    if (familyHead.lab >= new Date()) {
      FlowRouter.go("LoggedInAsMember");
    }
  }*/

  // Not correct, sort and find the correct latest membership.
  const currentMembership = memberships.length > 0 ? memberships[0] : null;


//  console.log("all Memberships:", Memberships.find().fetch());
//  console.log("all members:", members);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("handleSubmit");
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
  const toAdmin = (e) => {
    e.preventDefault();
    const user = Meteor.user();
    if (user.profile?.admin) {
      FlowRouter.go("/admin");
    }
    else {
      alert("Du är inte admin");
    }
}

  let message;
  if (!member) {
    message = "Du är inte medlem.";
  } else if (memberships.length === 0) {
    message = "Du är medlem men har inget medlemsskap.";
  } else if (!currentMembership.memberend || currentMembership.memberend < new Date()) {
    message = "Ditt medlemsskap har löpt ut, du lär ju skaffa ett nyt :))))))).";
  } else {
    FlowRouter.go("LoggedInAsMember");
  }

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
        <button onClick={toAdmin}>
          Go to admin-page
        </button>
      </form>
      <p>Din e-postadress: {email}</p>
      <button onClick={logout}>Logout</button>
    </>
  );
};
