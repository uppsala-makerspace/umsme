import React from "react";
import { HamburgerMenu } from "../HamburgerMenu/HamburgerMenu";
import { LanguageSwitcher } from "../LanguageSwitcher/langueSwitcher";
import "./TopBar.css";

export const TopBar = () => {
  return (
    <header className="top-bar">
      <HamburgerMenu />
      <LanguageSwitcher />
    </header>
  );
};

export default TopBar;
