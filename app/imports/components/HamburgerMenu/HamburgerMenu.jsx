import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTracker } from "meteor/react-meteor-data";
import { useTranslation } from "react-i18next";

export const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
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
          className="fixed inset-0 z-[100]"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        />
      )}
      <nav ref={menuRef} className="relative cursor-pointer z-[150]">
        <button
          className="border-none text-2xl leading-none cursor-pointer bg-transparent p-0 w-7 text-center"
          onClick={toggleMenu}
        >
          {isOpen ? "✖" : "☰"}
        </button>
        <ul className={`${isOpen
          ? "block absolute top-full left-0 bg-white border border-gray-200 rounded shadow-md py-2 list-none min-w-[200px] z-[200]"
          : "hidden"
        }`}>
          {[
            { to: "/storage", label: "myBox" },
            { to: "/liability", label: "liability" },
            { to: "/account", label: "myAccount" },
            { to: "/profile", label: "myProfile" },
            { to: "/contact", label: "contactUs" },
            { to: "/install", label: "installApp" },
          ].map(({ to, label }) => (
            <li key={to} className="text-lg font-bold mx-4 my-2 cursor-pointer">
              {location.pathname === to ? (
                <span className="text-brand-green cursor-default">{t(label)}</span>
              ) : (
                <Link to={to} className="no-underline text-black">{t(label)}</Link>
              )}
            </li>
          ))}
          <li className="text-lg font-bold mx-4 my-2 cursor-pointer">
            <button onClick={handleLogout} className="all-unset text-black cursor-pointer bg-transparent border-none p-0 font-bold text-lg">
              {t("logout")}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
};
