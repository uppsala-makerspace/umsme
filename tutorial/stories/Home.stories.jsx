import { fn } from "storybook/test";
import Home from "/imports/pages/home/Home";
import { withLayout } from "./decorators";
import {
  member,
  dates,
  activeLabStatus,
  renewalStatus,
  messages,
} from "./fixtures";

export default {
  title: "Tutorial/Home",
  component: Home,
  decorators: [withLayout],
};

const baseHomeArgs = {
  loading: false,
  memberName: member.firstName,
  verified: true,
  invite: null,
  isFamily: false,
};

// Filename: info-{lang}.png — post-verification welcome where member has no
// name yet. Triggers the noNameText* + addNameButton branch.
export const Info = {
  args: {
    ...baseHomeArgs,
    memberName: "",
    memberStatus: {},
    liabilityDate: null,
    liabilityOutdated: false,
    registered: false,
  },
  parameters: { tutorial: { path: "/", file: "info" } },
};

// Filename: no-membership-{lang}.png — home for a verified member who has
// just signed up but hasn't paid yet.
export const NoMembership = {
  args: {
    ...baseHomeArgs,
    memberStatus: {},
    liabilityDate: null,
    liabilityOutdated: false,
    registered: false,
  },
  parameters: { tutorial: { path: "/", file: "no-membership" } },
};

// Filename: liability-pending-{lang}.png — home immediately after payment for
// a new member: board hasn't approved AND liability hasn't been signed.
export const LiabilityPending = {
  args: {
    ...baseHomeArgs,
    memberStatus: activeLabStatus,
    liabilityDate: null,
    liabilityOutdated: false,
    registered: false,
    ...messages,
    messageCount: 1,
  },
  parameters: { tutorial: { path: "/", file: "liability-pending" } },
};

// Filename: liability-pending-registered-{lang}.png — existing member home
// where the only outstanding step is approving the liability (board approval
// not relevant, since they're already registered).
export const LiabilityPendingRegistered = {
  args: {
    ...baseHomeArgs,
    memberStatus: activeLabStatus,
    liabilityDate: null,
    liabilityOutdated: false,
    registered: true,
    ...messages,
    messageCount: 4,
  },
  parameters: { tutorial: { path: "/", file: "liability-pending-registered" } },
};

// Filename: board-pending-{lang}.png — new-member home where liability has
// been signed but the board hasn't approved yet.
export const BoardPending = {
  args: {
    ...baseHomeArgs,
    memberStatus: activeLabStatus,
    liabilityDate: dates.liabilityApprovedDate,
    liabilityOutdated: false,
    registered: false,
    ...messages,
    messageCount: 1,
  },
  parameters: { tutorial: { path: "/", file: "board-pending" } },
};

// Filename: ready-{lang}.png — home with everything in order.
export const Ready = {
  args: {
    ...baseHomeArgs,
    memberStatus: activeLabStatus,
    liabilityDate: dates.liabilityApprovedDate,
    liabilityOutdated: false,
    registered: true,
    ...messages,
    messageCount: 2,
  },
  parameters: { tutorial: { path: "/", file: "ready" } },
};

// Filename: renew-membership-{lang}.png — home with end date 12 days out so
// the renewal yellow strip + "Renew membership" button appear.
export const RenewMembership = {
  args: {
    ...baseHomeArgs,
    memberStatus: renewalStatus,
    liabilityDate: dates.liabilityApprovedDate,
    liabilityOutdated: false,
    registered: true,
    ...messages,
    messageCount: 3,
  },
  parameters: { tutorial: { path: "/", file: "renew-membership" } },
};

// Filename: install-entry-{lang}.png — same as Ready, but the green
// "Install app" button is left visible in the top bar so the install
// tutorial can point readers at it.
export const InstallEntry = {
  args: {
    ...baseHomeArgs,
    memberStatus: activeLabStatus,
    liabilityDate: dates.liabilityApprovedDate,
    liabilityOutdated: false,
    registered: true,
    ...messages,
    messageCount: 2,
  },
  parameters: { tutorial: { path: "/", file: "install-entry", showInstallButton: true } },
};

// Filename: installed-home-{lang}.png — same as Ready, but viewed as if
// the user is inside the installed PWA, so TopBar shows the InstalledIcon
// (phone-shaped icon) instead of the Install button.
export const InstalledHome = {
  args: {
    ...baseHomeArgs,
    memberStatus: activeLabStatus,
    liabilityDate: dates.liabilityApprovedDate,
    liabilityOutdated: false,
    registered: true,
    ...messages,
    messageCount: 2,
  },
  parameters: { tutorial: { path: "/", file: "installed-home", isPWA: true } },
};

// Filename: family-invite-{lang}.png — pending family invite welcome.
export const FamilyInvite = {
  args: {
    ...baseHomeArgs,
    memberName: "The_Partner",
    memberStatus: {},
    invite: { _id: "invite-1", email: "the-partner@example.com", infamily: "matthias-id" },
    onAcceptInvite: fn(),
    onDeclineInvite: fn(),
    liabilityDate: null,
    liabilityOutdated: false,
    registered: false,
  },
  parameters: { tutorial: { path: "/", file: "family-invite" } },
};
