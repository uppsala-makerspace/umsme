import React, { useState } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { useTranslation } from "react-i18next";
import "./Hamburger.css";

export const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <nav className={`nav-bar ${isOpen ? "menu-open" : ""}`}>
        {isOpen ? (
          <button className="hamburger-menu open" onClick={toggleMenu}>
            ✖
          </button>
        ) : (
          <button className="hamburger-menu" onClick={toggleMenu}>
            ☰
          </button>
        )}
        <ul className={`links ${isOpen ? "show" : ""}`}>
          <li>
            <a href="/LoggedInAsMember">Start</a>
          </li>
          <li>
            <a href="/LoggedInAsMember/keys">{t("keys")}</a>
          </li>
          <li>
            <a href="/LoggedInAsMember/accounts">{t("myAccount")}</a>
          </li>
          <li>
            <a href="/LoggedInAsMember/HandleMembership">{t("Membership")}</a>
          </li>
          <li>
            <a href="/LoggedInAsMember/calendar">{t("Calender")}</a>
          </li>
          <li>
            <a href="/LoggedInAsMember/contact">{t("contactUs")}</a>
          </li>
          <li>
            <a href="/LoggedInAsMember/kiosk">Kiosk</a>
          </li>
        </ul>
      </nav>
    </>
  );
};
