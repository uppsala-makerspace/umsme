import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import route from "/client/ui/Webapp/route";
import { LoginForm } from "./imports/components/LoginForm";
import { RegisterForm } from "./imports/components/RegisterForm";
import { LoggedIn } from "./imports/components/LoggedIn";
import { HandleMembership } from "./imports/components/HandleMembership";
import { WaitForEmailVerification } from "./imports/components/WaitForEmailVerification";
import "./imports/i18n"; // Detta ser till att i18n är initialiserad när appen startar
import { LoggedInAsMember } from "./imports/components/LoggedInAsMembers";
import { accounts } from "./imports/components/accounts";
import { calendar } from "./imports/components/calendar";

// We only allow login and register pages to be accessed when not logged in.
FlowRouter.triggers.enter([
  (context, redirect) => {
    if (
      !Meteor.userId() &&
      context.path !== "/login" &&
      context.path !== "/register" &&
      !context.path.startsWith("/admin") &&
      context.path !== "/WaitForEmailVerification"
    ) {
      redirect("/login");
    }
  },
]);

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

FlowRouter.route("/accounts", {
  action() {
    route("accounts", accounts);
  },
});

FlowRouter.route("/calendar", {
  action() {
    route("calendar", calendar);
  },
});
