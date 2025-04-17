import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import route from "/client/ui/Webapp/route";
import { LoginForm } from "./imports/components/LoginForm";
import { RegisterForm } from "./imports/components/RegisterForm";
import { LoggedIn } from "./imports/components/LoggedIn";
import { HandleMembership } from "./imports/components/HandleMembership";
import { WaitForEmailVerification } from "./imports/components/WaitForEmailVerification";
import "./imports/i18n"; // Detta ser till att i18n är initialiserad när appen startar
import { LoggedInAsMember } from "./imports/components/LoggedInAsMembers";
import { MembershipAgreement } from "./imports/components/MembershipAgreement";
import { Payment } from "./imports/components/Payment";
import { accounts } from "./imports/components/accounts";
import { calendar } from "./imports/components/calendar";
import { contact } from "./imports/components/Contact/contact";
import { ForgotPassword } from "./imports/components/ForgotPassword.jsx";
import { ResetPassword } from "./imports/components/ResetPassword.jsx";
import React from "react";

FlowRouter.triggers.enter([
  (context, redirect) => {
    handleRouteProtection(context, redirect);
  },
]);

const handleRouteProtection = async (context, redirect) => {
  const path = context.path;
  const user = Meteor.user();

  // Tillåt vissa offentliga sidor
  const publicPaths = [
    "/login",
    "/register",
    "/admin",
    "/waitForEmailVerification",
    "/ForgotPassword",
    "/reset-password",
  ];
  const isPublic = publicPaths.some((publicPath) =>
    path.startsWith(publicPath)
  );

  if (!user && !isPublic) {
    return redirect("/login");
  }

  if (user && path.startsWith("/LoggedInAsMember")) {
    try {
      const {
        member: m,
        memberships: ms,
        familyHeadMs: fmh,
      } = await Meteor.callAsync("findInfoForUser");

      const isMemberValid = m && ms[0]?.memberend >= new Date();
      const isFamilyHeadValid = m && fmh[0]?.memberend >= new Date();

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

FlowRouter.route("/login", {
  action() {
    route("login", LoginForm);
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
