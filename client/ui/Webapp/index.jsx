import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import route from "/client/ui/Webapp/route";
import { LoginForm } from "./imports/pages/LoginForm";
import { RegisterForm } from "./imports/pages/RegisterForm";
import { LoggedIn } from "./imports/pages/LoggedIn";
import { HandleMembership } from "./imports/pages/HandleMemberships/HandleMembership.jsx";
import { WaitForEmailVerification } from "./imports/pages/WaitForEmailVerification";
import "./imports/i18n"; // Detta ser till att i18n är initialiserad när appen startar
import { LoggedInAsMember } from "./imports/pages/LoggedInAsMembers";
import { MembershipAgreement } from "./imports/pages/MembershipAgreement/MembershipAgreement.jsx";
import { Payment } from "./imports/pages/Payment/Payment.jsx";
import { accounts } from "./imports/pages/acounts/accounts";
import { calendar } from "./imports/pages/Calendar/calendar";
import { contact } from "./imports/pages/Contact/contact";
import { kiosk } from "./imports/pages/Kiosk/kiosks.jsx";
import { ForgotPassword } from "./imports/pages/ForgotPassword.jsx";
import { ResetPassword } from "./imports/pages/ResetPassword.jsx";
import React from "react";
import { UnlockDoors } from "./imports/pages/Unlock/UnlockDoors.jsx";
import { createMember } from "./imports/pages/createMember.jsx";
import { AddFamilyMember } from "./imports/pages/addFamilyMember";

FlowRouter.triggers.enter([
  (context, redirect) => {
    handleRouteProtection(context, redirect);
  },
]);

const handleRouteProtection = async (context, redirect) => {
  const path = context.path;
  const user = Meteor.user();

  const publicPaths = [
    "/login",
    "/register",
    "/admin",
    "/waitForEmailVerification",
    "/ForgotPassword",
    "/reset-password",
    "/createMember", //ta bort härifrån senare
  ];
  const isPublic = publicPaths.some((publicPath) =>
    path.startsWith(publicPath)
  );

  if (!user && !isPublic && !Meteor.loggingIn()) {
    return redirect("/login");
  }

  if (user && path.startsWith("/LoggedInAsMember")) {
    try {
      const {
        member: m,
        memberships: ms,
        familyHead: fmh,
      } = await Meteor.callAsync("findInfoForUser");

      const isMemberValid = m && ms[0]?.memberend >= new Date();
      const isFamilyHeadValid = m && fmh?.memberend >= new Date();

      if (!isMemberValid && !isFamilyHeadValid) {
        return redirect("/loggedIn");
      }
    } catch (error) {
      console.error("Fel vid medlemskapskontroll:", error);
      redirect("/login");
    }
  }
};

FlowRouter.route("/", {
  name: "webbapp",
  /*  action() {
    route('start', () => <div>Here be dragons</div>);
  },*/
  triggersEnter: [
    (context, redirect) => {
      redirect("/login");
    },
  ],
});

FlowRouter.route("/register", {
  action() {
    route("register", RegisterForm);
  },
});

FlowRouter.route("/WaitForEmailVerification", {
  action() {
    route("WaitForEmailVerification", WaitForEmailVerification);
  },
});

FlowRouter.route("/LoggedInAsMember/HandleMembership", {
  action() {
    route("HandleMembership", HandleMembership);
  },
});

FlowRouter.route("/HandleMembership", {
  action() {
    route("HandleMembership", HandleMembership);
  },
});

FlowRouter.route("/login", {
  action() {
    route("login", LoginForm);
  },
});

FlowRouter.route("/createMember", {
  action() {
    route("createMember", createMember);
  },
});

FlowRouter.route("/addFamilyMember", {
  action() {
    route("addFamilyMember", AddFamilyMember);
  },
});

FlowRouter.route("/loggedIn", {
  action() {
    route("loggedIn", LoggedIn);
  },
});

FlowRouter.route("/LoggedInAsMember", {
  action() {
    route("LoggedInAsMember", LoggedInAsMember);
  },
});

FlowRouter.route("/MembershipAgreement", {
  action() {
    route("MembershipAgreement", MembershipAgreement);
  },
});

FlowRouter.route("/Payment", {
  action() {
    route("Payment", Payment);
  },
});

FlowRouter.route("/LoggedInAsMember/accounts", {
  action() {
    route("accounts", accounts);
  },
});

FlowRouter.route("/LoggedInAsMember/calendar", {
  action() {
    route("calendar", calendar);
  },
});

FlowRouter.route("/ForgotPassword", {
  action() {
    route("ForgotPassword", ForgotPassword);
  },
});

FlowRouter.route("/reset-password/:token", {
  name: "resetPassword",
  action(params) {
    console.log("Token:", params.token);
    route("ResetPassword", () => <ResetPassword token={params.token} />);
  },
});

FlowRouter.route("/LoggedInAsMember/contact", {
  action() {
    route("contact", contact);
  },
});

FlowRouter.route("/LoggedInAsMember/keys", {
  action() {
    route("UnlockDoors", UnlockDoors);
  },
});

FlowRouter.route("/LoggedInAsMember/kiosk", {
  action() {
    route("kiosk", kiosk);
  },
});
