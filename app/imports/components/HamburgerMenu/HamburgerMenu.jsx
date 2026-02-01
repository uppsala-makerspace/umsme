import React, { useState, useEffect, useRef } from "react";
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
  const menuRef = useRef(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
      {isOpen && (
        <div
          className="menu-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        />
      )}
      <nav ref={menuRef} className={`nav-bar ${isOpen ? "menu-open" : ""}`}>
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
            <Link to="/storage">{t("myBox")}</Link>
          </li>
          <li>
            <Link to="/liability">{t("liability")}</Link>
          </li>
          <li>
            <Link to="/account">{t("myAccount")}</Link>
          </li>
          <li>
            <Link to="/profile">{t("myProfile")}</Link>
          </li>
          <li>
            <Link to="/contact">{t("contactUs")}</Link>
          </li>
          <li>
            <Link to="/install">{t("installApp")}</Link>
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
