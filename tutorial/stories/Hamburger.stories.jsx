import React, { useEffect } from "react";
import Home from "/imports/pages/home/Home";
import { withLayout } from "./decorators";
import { member, dates, activeLabStatus, messages } from "./fixtures";

export default {
  title: "Tutorial/Hamburger",
  decorators: [withLayout],
};

// HamburgerMenu's open state is internal (useState in the component). To
// capture a screenshot of the open menu we click the toggle button after
// mount and let React re-render before the screenshot script grabs the PNG.
const HomeWithMenuOpen = (args) => {
  useEffect(() => {
    const id = setTimeout(() => {
      const btn = document.querySelector("header nav button");
      if (btn) btn.click();
    }, 200);
    return () => clearTimeout(id);
  }, []);
  return <Home {...args} />;
};

// Filename: hamburger-{lang}.png — Home (liability still pending) with the
// side menu open showing the full list of links.
export const Hamburger = {
  render: (args) => <HomeWithMenuOpen {...args} />,
  args: {
    loading: false,
    memberName: member.firstName,
    memberStatus: activeLabStatus,
    verified: true,
    invite: null,
    liabilityDate: null,
    liabilityOutdated: false,
    isFamily: false,
    registered: true,
    ...messages,
    messageCount: 4,
  },
  parameters: { tutorial: { path: "/", file: "hamburger" } },
};
