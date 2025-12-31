import React, { useState, useEffect } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { useTranslation } from "react-i18next";
import "./Hamburger.css";

export const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const user = useTracker(() => Meteor.user());
  const [hasMember, setHasMember] = useState(false);

  // Load member information
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const { member } = await Meteor.callAsync("findInfoForUser");
        setHasMember(!!member);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [user?._id]);

  if (!hasMember) {
    return null;
  }

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
            <a href="/profile">{t("myProfile")}</a>
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
