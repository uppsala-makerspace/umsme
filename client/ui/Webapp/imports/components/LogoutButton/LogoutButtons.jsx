import React from "react";
import { useTranslation } from "react-i18next";
import "./LogoutButtons.css";
import { useTracker } from "meteor/react-meteor-data";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";

export const LogoutButton = ({ onClick }) => {
  const { t } = useTranslation();
  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      } else {
        FlowRouter.go("/login");
      }
    });
  };
  return (
    <button className="form-button logout-button" onClick={onClick}>
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
