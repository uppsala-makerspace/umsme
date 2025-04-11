import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { Template } from "meteor/templating";
import { Members } from "/collections/members.js";
import { Payments } from "/collections/payments";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "./langueSwitcher";
import { useTranslation } from "react-i18next";

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
                    name: "Medlemsskap Bas",
                    price: "200 kr",
                    description:
                      "Med vårt basmedlemskap är du välkommen att nyttja vårt makerspace under våra öppna kvällar samt på lördagskurserna.",
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
                    name: "Labbmedlem Individ",
                    price: "1200 kr",
                    description:
                      "Med ett labbmedlemskap får du tillgång till Makerspace 24/7. Du får också en förvaringslåda att ha saker i så du slipper ta dem fram och tillbaka.",
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
              <h2>{t("memberFamilyPrice")}</h2>
              <button
                className="addMembership"
                onClick={() => {
                  Session.set("selectedMembership", {
                    name: "Labbmedlem Familj",
                    price: "2000 kr",
                    description:
                      "Med ett labbmedlemskap för familjen får du tillgång till Makerspace 24/7 för upp till 4 personer som är skrivna på samma adress.",
                  });
                  FlowRouter.go("/MembershipAgreement");
                }}
              >
                {t("choose")}
              </button>
            </div>
          </div>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    </div>
  );
};
