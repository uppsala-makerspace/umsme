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
import LogoutButton from "../../components/LogoutButton";
import { LoginForm } from "../LoginForm";

export const HandleMembership = () => {
  const { t, i18n } = useTranslation();
  const user = useTracker(() => Meteor.user());

  useEffect(() => {
    const color = "#f0efef";

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);

    return () => {
      // (valfritt) återställ eller lämna kvar färgen när man lämnar sidan
    };
  }, []);

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
        <div className="login-form">
        <div className="membershipsContainer">
          <div>
            <h1>{t("memberships")}</h1>
            <p>{t("Membershipstext1")}</p>
            <br />

            <div className="membership">
              <h2>{t("memberBase")}</h2>
              <p>{t("memberBasetext")}</p>
              <div className="price">
                <h2>{t("memberBasePrice")}</h2>
                <button
                  className="addMembership"
                  onClick={() => {
                    Session.set("selectedMembership", {
                      name: t("memberBase"),
                      price: t("memberBasePrice"),
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
                <h2>{t("memberLabPrice")}</h2>
                <button
                  className="addMembership"
                  onClick={() => {
                    Session.set("selectedMembership", {
                      name: t("memberIndivdual"),
                      price: t("memberLabPrice"),
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
              <h2>{t("memberFamilyLab")}</h2>
              <p>{t("memberFamilyLabText")}</p>
              <div className="price">
                <h2>{t("memberFamilyLabPrice")}</h2>
                <button
                  className="addMembership"
                  onClick={() => {
                    Session.set("selectedMembership", {
                      name: t("memberFamilyLab"),
                      price: t("memberFamilyLabPrice"),
                      description: t("memberFamilyLabText"),
                    });
                    FlowRouter.go("/MembershipAgreement");
                  }}
                >
                  {t("choose")}
                </button>
              </div>
            </div>

            <div className="membership">
              <h2>{t("memberDiscountedBase")}</h2>
              <p>{t("memberDiscountedBaseText")}</p>
              <div className="price">
                <h2>{t("memberDiscountedBasePrice")}</h2>
                <button
                  className="addMembership"
                  onClick={() => {
                    Session.set("selectedMembership", {
                      name: t("memberDiscountedBase"),
                      price: t("memberDiscountedBasePrice"),
                      description: t("memberDiscountedBaseText"),
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
                <h2>{t("memberDiscountedLabPrice")}</h2>
                <button
                  className="addMembership"
                  onClick={() => {
                    Session.set("selectedMembership", {
                      name: t("memberDiscountedLab"),
                      price: t("memberDiscountedLabPrice"),
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
              <h2>{t("memberFamilyBase")}</h2>
              <p>{t("memberFamilyBaseText")}</p>
              <div className="price">
                <h2>{t("memberFamilyBasePrice")}</h2>
                <button
                  className="addMembership"
                  onClick={() => {
                    Session.set("selectedMembership", {
                      name: t("memberFamilyBase"),
                      price: t("memberFamilyBasePrice"),
                      description: t("memberFamilyBaseText"),
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
                <h2>{t("memberQuarterlyPrice")}</h2>
                <button
                  className="addMembership"
                  onClick={() => {
                    Session.set("selectedMembership", {
                      name: t("memberQuarterlyLab"),
                      price: t("memberQuarterlyPrice"),
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
    </div>
  );
};
