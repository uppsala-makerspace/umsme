import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { useTranslation } from "react-i18next";
import "./MembershipAgreement.css";

export const MembershipAgreement = () => {
  const [membership, setMembership] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [liabilityText, setLiabilityText] = useState("");

  useEffect(() => {
    const selectedMembership = Session.get("selectedMembership");
    if (selectedMembership) {
      setMembership(selectedMembership);
    } else {
      FlowRouter.go("/HandleMembership");
    }
  }, []);

  useEffect(() => {
    readLiabilityText();
  }, [currentLanguage]);

  const readLiabilityText = async () => {
    try {
      const respone = await fetch("/liability.json");
      const liability = await respone.json();
      setLiabilityText(liability?.[currentLanguage]?.text);
      console.log("Liability text loaded:", liabilityText);
    } catch (error) {
      console.error("Error loading liability text:", error);
    }
  };
  const handleScroll = (e) => {
    const element = e.target;
    const isAtBottom =
      element.scrollHeight - element.scrollTop <= element.clientHeight + 1; // Lägg till en liten tolerans
    if (isAtBottom) {
      setIsScrolledToBottom(true);
    }
  };

  const handleAgreement = () => {
    console.log("Ansvarsförbindelse godkänd för:", membership);
    FlowRouter.go("/Payment");
  };

  if (!membership) {
    return <div>Laddar...</div>;
  }

  return (
    <div>
      <LanguageSwitcher />

      <div className="AgreementHolder">
        <button
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "black",
            marginTop: "30px",
          }}
          className="BackButton"
          onClick={() => FlowRouter.go("/HandleMembership")}
        >
          ← {t("OurMemberships")}
        </button>
        <h1>{t("MembershipAgreement")}</h1>
        <h2>{membership.name}</h2>
        <p>{membership.description}</p>
        <h3>{membership.price} </h3>
        <p>{t("AgreementInfo")}</p>
        <div className="login-form">
          <button
            className="AgreementButton"
            onClick={() => setIsModalOpen(true)}
          >
            {t("AgreementButton")}
          </button>
        </div>
        <div>
          <input
            type="checkbox"
            id="agreement"
            disabled={!isScrolledToBottom}
            onChange={(e) => setIsCheckboxChecked(e.target.checked)}
          />
          <label htmlFor="agreement">{t("IAgree")}</label>
        </div>
        <div className="login-form">
          <button
            className={`pay-button ${
              isScrolledToBottom && isCheckboxChecked ? "hover-enabled" : ""
            }`}
            onClick={handleAgreement}
            disabled={!isScrolledToBottom || !isCheckboxChecked}
          >
            {t("Pay")}
          </button>

          {isModalOpen && (
            <div className="MembershipAgreementModal">
              <div className="AgreementContent" onScroll={handleScroll}>
                <h2>{t("MembershipAgreement")}</h2>

                <p style={{ whiteSpace: "pre-line" }}>{liabilityText}</p>
                <button onClick={() => setIsModalOpen(false)}>
                  {t("Close")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
