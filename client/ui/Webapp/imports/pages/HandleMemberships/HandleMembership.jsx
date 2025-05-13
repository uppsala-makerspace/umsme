import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { Template } from "meteor/templating";
import { Members } from "/collections/members.js";
import { Payments } from "/collections/payments";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { useTranslation } from "react-i18next";
import { FiLogOut } from "react-icons/fi";
import { HamburgerMenu } from "../../components/HamburgerMenu/HamburgerMenu";
import "./handleMembership.css";
import { LogoutButton } from "../../components/LogoutButton/LogoutButtons.jsx";

export const HandleMembership = () => {
  const { t, i18n } = useTranslation();
  const user = useTracker(() => Meteor.user());

  const { members, isLoading } = useTracker(() => {
    const handle = Meteor.subscribe("members");
    return {
      members: Members.find().fetch(),
      isLoading: !handle.ready(),
    };
  });

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
    <div>
      {FlowRouter.current().path.endsWith(
        "/LoggedInAsMember/HandleMembership"
      ) && <HamburgerMenu />}
      <LanguageSwitcher />
      <div className="membershipsContainer">
        <div>
          <h1>{t("memberships")}</h1>
          <p>{t("membershipsText")}</p>
          <br />

          <div className="membership">
            <h2>{t("memberBase")}</h2>
            <p>{t("memberBasetext")}</p>
            <div className="price">
              <h2>{t("priceBas")}</h2>
              <button
                className="addMembership"
                onClick={() => {
                  Session.set("selectedMembership", {
                    name: t("memberBase"),
                    price: t("priceBas"),
                    description: t("memberBasetext"),
                  });
                  FlowRouter.go("/MembershipAgreement");
                }}
              >
                {t("choose")}
              </button>
            </div>
          </div>

          <div className="membership">
            <h2>{t("memberIndivdual")}</h2>
            <p>{t("memberIndivdualText")}</p>
            <div className="price">
              <h2>{t("priceLab")}</h2>
              <button
                className="addMembership"
                onClick={() => {
                  Session.set("selectedMembership", {
                    name: t("memberIndivdual"),
                    price: t("priceLab"),
                    description: t("memberIndivdualText"),
                  });
                  FlowRouter.go("/MembershipAgreement");
                }}
              >
                {t("choose")}
              </button>
            </div>
          </div>

          <div className="membership">
            <h2>{t("labMemberFamily")}</h2>
            <p>{t("labMemberFamilyText")}</p>
            <div className="price">
              <h2>{t("labMemberFamilyPrice")}</h2>
              <button
                className="addMembership"
                onClick={() => {
                  Session.set("selectedMembership", {
                    name: t("labMemberFamily"),
                    price: t("labMemberFamilyPrice"),
                    description: t("labMemberFamilyText"),
                  });
                  FlowRouter.go("/MembershipAgreement");
                }}
              >
                {t("choose")}
              </button>
            </div>
          </div>

          <div className="membership">
            <h2>{t("memberDiscounted")}</h2>
            <p>{t("memberDiscountedText")}</p>
            <div className="price">
              <h2>{t("priceDiscounted")}</h2>
              <button
                className="addMembership"
                onClick={() => {
                  Session.set("selectedMembership", {
                    name: t("memberDiscounted"),
                    price: t("priceDiscounted"),
                    description: t("memberDiscountedText"),
                  });
                  FlowRouter.go("/MembershipAgreement");
                }}
              >
                {t("choose")}
              </button>
            </div>
          </div>

          <div className="membership">
            <h2>{t("memberDiscountedLab")}</h2>
            <p>{t("memberDiscountedLabText")}</p>
            <div className="price">
              <h2>{t("priceDiscountedLab")}</h2>
              <button
                className="addMembership"
                onClick={() => {
                  Session.set("selectedMembership", {
                    name: t("memberDiscountedLab"),
                    price: t("priceDiscountedLab"),
                    description: t("memberDiscountedLabText"),
                  });
                  FlowRouter.go("/MembershipAgreement");
                }}
              >
                {t("choose")}
              </button>
            </div>
          </div>

          <div className="membership">
            <h2>{t("memberFamily")}</h2>
            <p>{t("memberFamilyText")}</p>
            <div className="price">
              <h2>{t("priceFamily")}</h2>
              <button
                className="addMembership"
                onClick={() => {
                  Session.set("selectedMembership", {
                    name: t("memberFamily"),
                    price: t("priceFamily"),
                    description: t("memberFamilyText"),
                  });
                  FlowRouter.go("/MembershipAgreement");
                }}
              >
                {t("choose")}
              </button>
            </div>
          </div>

          <div className="membership">
            <h2>{t("memberQuarterlyLab")}</h2>
            <p>{t("memberQuarterlyLabText")}</p>
            <div className="price">
              <h2>{t("priceQuarterlyLab")}</h2>
              <button
                className="addMembership"
                onClick={() => {
                  Session.set("selectedMembership", {
                    name: t("memberQuarterlyLab"),
                    price: t("priceQuarterlyLab"),
                    description: t("memberQuarterlyLabText"),
                  });
                  FlowRouter.go("/MembershipAgreement");
                }}
              >
                {t("choose")}
              </button>
            </div>
          </div>
          <LogoutButton onClick={logout} />
        </div>
      </div>
    </div>
  );
};
