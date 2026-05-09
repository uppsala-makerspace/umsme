import { fn } from "storybook/test";
import LoginPage from "/imports/pages/login/Login";
import RegisterPage from "/imports/pages/register/Register";
import CheckEmailPage from "/imports/pages/checkEmail/CheckEmail";
import ProfilePage from "/imports/pages/profile/Profile";
import { withLayout } from "./decorators";

export default {
  title: "Tutorial/Onboarding",
  decorators: [withLayout],
};

// Login, Register, CheckEmail are rendered by index.jsx wrappers in production
// with `<Layout bottomNav={false} showNotifications={false}>`. The user isn't
// authenticated so HamburgerMenu hides itself. The result is a TopBar with
// just the LanguageSwitcher (Install button is pre-dismissed via localStorage
// in decorators.jsx).

const minimalShell = {
  bottomNav: false,
  showNotifications: false,
  hasMember: false,
};

// Filename: login-{lang}.png
export const Login = {
  render: (args) => <LoginPage {...args} />,
  args: { onSubmit: fn() },
  parameters: { tutorial: { ...minimalShell, path: "/login", file: "login" } },
};

// Filename: register-{lang}.png
export const Register = {
  render: (args) => <RegisterPage {...args} />,
  args: { onSubmit: fn() },
  parameters: { tutorial: { ...minimalShell, path: "/register", file: "register" } },
};

// Filename: check-{lang}.png
export const Check = {
  render: (args) => <CheckEmailPage {...args} />,
  args: { onSubmit: fn(), loading: false, submitted: false },
  parameters: { tutorial: { ...minimalShell, path: "/check-email", file: "check" } },
};

// Filename: profil-{lang}.png — the My Profile form, empty so placeholders
// show. Uses the full app shell since the user is signed in.
export const Profil = {
  render: (args) => <ProfilePage {...args} />,
  args: {
    onSubmit: fn(),
    initialName: "",
    initialMobile: "",
    initialBirthyear: "",
    initialGender: "",
    initialRfid: "",
  },
  parameters: { tutorial: { path: "/profile", file: "profil", showNotifications: false } },
};
