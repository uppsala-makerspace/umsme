import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { Template } from "meteor/templating";
import { Members } from "/collections/members.js";
import { Payments } from "/collections/payments";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "./langueSwitcher";

export const HandleMembership = () => {
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
          <h1>Våra Medlemsskap:</h1>
          <p>
            På Uppsala Makerspace vill vi att skapande ska vara tillgängligt för
            alla, oavsett ekonomi. Därför vill vi hålla priserna för medlemskap
            så låga som möjligt. Det innebär att vi alla måste hjälpas åt med
            det arbete som krävs för att vår förening ska må bra.
          </p>
          <br />

          <div className="membership">
            <h2>Medlemsskap Bas</h2>
            <p>
              Med vårt basmedlemskap är du välkommen att nyttja vårt makerspace
              under våra öppna kvällar samt på lördagskurserna.
            </p>
            <div className="price">
              <h2>200 kr/år</h2>
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
                Välj
              </button>
            </div>
          </div>

          <div className="membership">
            <h2>Labbmedlem Individ</h2>
            <p>
              Med ett labbmedlemskap får du tillgång till Makerspace 24/7. Du
              får också en förvaringslåda att ha saker i så du slipper ta dem
              fram och tillbaka.
            </p>
            <div className="price">
              <h2>1200 kr/år</h2>
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
                Välj
              </button>
            </div>
          </div>

          <div className="membership">
            <h2>Labbmedlem Familj</h2>
            <p>
              Med ett labbmedlemskap för familjen får du tillgång till
              Makerspace 24/7 för upp till 4 personer som är skrivna på samma
              adress.
            </p>
            <div className="price">
              <h2>2000 kr/år</h2>
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
                Välj
              </button>
            </div>
          </div>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    </div>
  );
};
