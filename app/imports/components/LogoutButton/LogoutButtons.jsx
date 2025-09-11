import React from "react";
import { useTranslation } from "react-i18next";
import "./LogoutButtons.css";

export default () => {
  const { t } = useTranslation();
  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
    });
  };
  return (
    <button className="form-button logout-button" onClick={logout}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="logout-icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ backgroundColor: "transparent" }}
      >
        <path d="M15 21h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" />
        <polyline points="8 7 3 12 8 17" />
        <line x1="3" y1="12" x2="15" y2="12" />
      </svg>
      {t("logout")}
    </button>
  );
};