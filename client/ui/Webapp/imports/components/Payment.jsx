import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { Template } from "meteor/templating";
import { Members } from "/collections/members.js";
import { Payments } from "/collections/payments";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "./langueSwitcher";

export const Payment = () => {
  const [membership, setMembership] = useState(null);

  useEffect(() => {
    const selectedMembership = Session.get("selectedMembership");
    if (selectedMembership) {
      setMembership(selectedMembership);
    } else {
      FlowRouter.go("/HandleMembership");
    }
  }, []);

  if (!membership) {
    return <div>Laddar...</div>;
  }
  const handlePayment = (price) =>{
    const price1 = price.match(/^\d+/)?.[0];
    Meteor.call("swish.createTestPayment", price1, (err, res) => {
      if (err) {
        alert("Fel: " + err.reason);
      } else {
        console.log("Swish-response:", res);
        if (res === "PAID"){
          //Lägg in logik för att skapa en member/membership
        }
      }
    })

  }

  return (
    <>
    <LanguageSwitcher />
    <div className="login-form">
      <h1>Betalning</h1>
      <h2>{membership.name}</h2>
      <p>{membership.description}</p>
      <h3>{membership.price}</h3>
      <button onClick={() => handlePayment(membership.price)}>
        Slutför betalning
      </button>
    </div>
    </>
  );
};
