import React, { useState } from "react";
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
            <a href="/">Start</a>
          </li>
          <li>
            <a href="/unlock">{t("keys")}</a>
          </li>
          <li>
            <a href="/account">{t("myAccount")}</a>
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
