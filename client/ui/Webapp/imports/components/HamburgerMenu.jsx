import React, { useState } from "react";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";

export const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toAccounts = () => {
    FlowRouter.go("/accounts");
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
            <a href="/keys">Nycklar</a>
          </li>
          <li>
            <button onClick={toAccounts}></button>
          </li>
          <li>
            <a href="/memberships">Medlemskap</a>
          </li>
          <li>
            <a href="/calender">Kalender</a>
          </li>
          <li>
            <a href="/contact">Kontakta oss</a>
          </li>
        </ul>
      </nav>
    </>
  );
};
