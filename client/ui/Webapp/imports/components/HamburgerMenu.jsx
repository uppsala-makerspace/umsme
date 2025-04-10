import React, {useState} from "react";

export const HamburgerMenu = () => {

    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => { setIsOpen(!isOpen); };

    return(
        <>
        <nav className={`nav-bar ${isOpen ? 'menu-open' : ''}`}>
        {isOpen ? (
            <button className="hamburger-menu open" onClick={toggleMenu}>
                ✖ 
            </button>
            ) : (
            <button className="hamburger-menu" onClick={toggleMenu}>
                ☰
            </button>
            )}
            <ul className={`links ${isOpen ? 'show' : ''}`}>
                <li>
                    <a href="/keys">Nycklar</a>
                </li>
                <li>
                    <a href="/account">Ditt konto</a>
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
    )
}