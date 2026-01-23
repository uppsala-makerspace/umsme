import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HomeIcon as HomeOutline,
  LockOpenIcon as LockOutline,
  MapIcon as MapOutline,
  CalendarIcon as CalendarOutline,
  DocumentTextIcon as DocOutline,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  LockOpenIcon as LockSolid,
  MapIcon as MapSolid,
  CalendarIcon as CalendarSolid,
  DocumentTextIcon as DocSolid,
} from "@heroicons/react/24/solid";
import "./BottomNavigation.css";

const navItems = [
  { path: "/", labelKey: "navHome", OutlineIcon: HomeOutline, SolidIcon: HomeSolid, exact: true },
  { path: "/unlock", labelKey: "navDoors", OutlineIcon: LockOutline, SolidIcon: LockSolid },
  { path: "/map", labelKey: "navMap", OutlineIcon: MapOutline, SolidIcon: MapSolid },
  { path: "/calendar", labelKey: "navCalendar", OutlineIcon: CalendarOutline, SolidIcon: CalendarSolid },
  { path: "/certificates", labelKey: "navCertificates", OutlineIcon: DocOutline, SolidIcon: DocSolid },
];

export default () => {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const active = isActive(item);
        const Icon = active ? item.SolidIcon : item.OutlineIcon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={`bottom-nav-item ${active ? "active" : ""}`}
          >
            <Icon className="bottom-nav-icon" />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
