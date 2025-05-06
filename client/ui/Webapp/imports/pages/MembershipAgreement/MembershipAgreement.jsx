import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { Template } from "meteor/templating";
import { Members } from "/collections/members.js";
import { Payments } from "/collections/payments";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { useTranslation } from "react-i18next";
import './MembershipAgreement.css';

export const MembershipAgreement = () => {
  const [membership, setMembership] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const selectedMembership = Session.get("selectedMembership");
    if (selectedMembership) {
      setMembership(selectedMembership);
    } else {
      FlowRouter.go("/HandleMembership");
    }
  }, []);

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
        <button
          className="AgreementButton"
          onClick={() => setIsModalOpen(true)}
        >
          {t("AgreementButton")}
        </button>
        <div>
          <input
            type="checkbox"
            id="agreement"
            disabled={!isScrolledToBottom}
            onChange={(e) => setIsCheckboxChecked(e.target.checked)}
          />
          <label htmlFor="agreement">{t("IAgree")}</label>
        </div>
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
              <p>
                {
                  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec interdum ut nunc ut accumsan. Aliquam eget odio at arcu tempus euismod vel ut dolor. Quisque sem dui, tristique at interdum quis, egestas nec libero. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nunc eu eleifend tellus. Proin lectus ipsum, ultrices non aliquet sed, iaculis sed felis. Sed lobortis pulvinar accumsan. Nulla ut finibus lorem. Duis venenatis, dui quis mattis dapibus, quam lacus dictum metus, nec fringilla diam mauris in tortor. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nullam eu gravida est. In interdum risus erat, a vulputate metus lacinia eu. Etiam in nibh pharetra, dapibus eros vel, dictum tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum in porta ipsum, vitae posuere eros. Fusce nec enim aliquet, accumsan dui ultricies, consectetur libero. Integer ac erat sed eros lobortis rhoncus. Donec hendrerit quam quis tincidunt molestie. Nam vulputate neque a fringilla vulputate. Donec tempus, magna non ullamcorper pretium, eros enim scelerisque ligula, nec suscipit quam quam eu diam. Nulla facilisi. Sed urna dui, iaculis vel molestie ac, efficitur vitae enim. Aliquam nibh ex, placerat egestas turpis id, malesuada rhoncus ex. Nam sollicitudin enim enim, at imperdiet tellus consectetur sit amet. Maecenas fermentum hendrerit ultrices. Nunc accumsan ex ultrices iaculis auctor. Sed sodales, ligula in malesuada lacinia, lorem sapien congue diam, nec consectetur dui odio quis ipsum. Pellentesque eget rutrum velit. Pellentesque et quam euismod, ultrices eros quis, pretium neque. Vivamus eu ligula bibendum, aliquam lectus non, placerat elit. Curabitur congue, odio sit amet eleifend mollis, leo nibh dignissim metus, pretium blandit dui mi eu nisi. Praesent non rutrum est. Vivamus hendrerit nibh et tellus ultricies, eu elementum nunc cursus. Suspendisse potenti. Nam vitae consequat arcu. Nullam eget arcu iaculis, pellentesque turpis ac, eleifend arcu. Aliquam vel aliquam justo, id facilisis mauris. Quisque ut tincidunt velit, molestie sodales arcu. Nunc condimentum lorem ipsum, placerat rutrum eros maximus fermentum. Interdum et malesuada fames ac ante ipsum primis in faucibus. Fusce viverra dictum lectus, ut vehicula neque efficitur sed. Cras condimentum, mi ac blandit finibus, sapien odio feugiat sapien, a posuere nisl diam a nunc. Nulla viverra libero nec sem tristique feugiat et eu tortor. Vestibulum ultrices enim mi, nec bibendum sem ornare sit amet. Suspendisse potenti. Cras a mi euismod, sollicitudin est in, fringilla elit. Proin aliquet tempor ultricies. Donec lacus nibh, ullamcorper id luctus sed, elementum pharetra ipsum. Maecenas vehicula ex ornare lectus tempus, ac faucibus sem mollis. Aliquam viverra lacinia mattis. Fusce semper est eget tristique cursus. Sed diam neque, eleifend eu facilisis pellentesque, aliquam et odio. Aliquam et dui sed odio lacinia sagittis. Sed vel arcu in ante sodales porttitor. Aenean consectetur tortor eu diam accumsan ultrices. Aliquam malesuada eget nulla a maximus."
                }
              </p>
              <p style={{ marginTop: "1000px" }}>{t("CloseToAgree")}</p>
              <button onClick={() => setIsModalOpen(false)}>
                {t("Close")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
