import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTracker } from "meteor/react-meteor-data";
import { useTranslation } from "react-i18next";
import "./Hamburger.css";

export const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const handleLogout = () => {
    Meteor.logout(() => {
      navigate("/login");
    });
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
            <Link to="/">Start</Link>
          </li>
          <li>
            <Link to="/unlock">{t("keys")}</Link>
          </li>
          <li>
            <Link to="/account">{t("myAccount")}</Link>
          </li>
          <li>
            <Link to="/profile">{t("myProfile")}</Link>
          </li>
          <li>
            <Link to="/calendar">{t("Calender")}</Link>
          </li>
          <li>
            <Link to="/LoggedInAsMember/contact">{t("contactUs")}</Link>
          </li>
          <li>
            <button onClick={handleLogout} className="logout-button">
              {t("logout")}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
};
