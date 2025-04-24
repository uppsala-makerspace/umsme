import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { Template } from "meteor/templating";
import { Members } from "/collections/members.js";
import { Payments } from "/collections/payments";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "./langueSwitcher";
import { result } from "underscore";

export const Payment = () => {
  const user = useTracker(() => Meteor.user());

  const [membershipType, setMembershipType] = useState(null);
  const [paymentApproved, setPaymentApproved] = useState(false);

  useEffect(() => {
    const selectedMembership = Session.get("selectedMembership");
    if (selectedMembership) {
      setMembershipType(selectedMembership);
    } else {
      FlowRouter.go("/HandleMembership");
    }
  }, []);

  if (!membershipType) {
    return <div>Laddar...</div>;
  }
  const handlePayment = (price) => {
    const price1 = price.match(/^\d+/)?.[0];
    Meteor.call("swish.createTestPayment", price1, (err, res) => {
      if (err) {
        alert("Fel: " + err.reason);
      } else {
        console.log("Swish-response:", res);
        if (res === "PAID") {
          Meteor.call(
            "addMember",
            {
              name: "should be name",
              email:
                user?.emails?.[0]?.address || "Ingen e-postadress hittades",
              youth: true,
              mobile: "0701234567",
            },
            (err, member) => {
              if (err) {
                console.error("❌ Kunde inte skapa medlem:", err);
              } else {
                console.log("✅ Medlem skapad:", member);
                console.log("Medlem._id:", member._id);

                Meteor.call(
                  "addMembership",
                  {
                    mid: member._id, // this ID connects member to membership
                    amount: 1200,
                    start: new Date(),
                    type: "member", // eller "lab", "labandmember"
                    discount: false,
                    family: false,
                  },
                  (err, membership) => {
                    if (err) {
                      console.error("❌ Kunde inte skapa membership:", err);
                    } else {
                      console.log("✅ Membership skapad:", membership);
                      Meteor.call(
                        "addPayment",
                        {
                          type: "swish",
                          amount: price1,
                          date: new Date(),
                          message: "Swishbetalning för membership",
                          name: "should be name",
                          mobile: "0701234567",
                          member: member._id,
                          membership: membership.mid, // this ID connects payment to membership
                        },
                        (err, paymentData) => {
                          if (err) {
                            console.error(
                              "❌ Gick ej att lägga till betalning:",
                              err
                            );
                          } else {
                            console.log(
                              "✅ Betalning tillagd med ID:",
                              paymentData
                            );
                            setPaymentApproved(true);
                          }
                        }
                      );
                    }
                  }
                );
              }
            }
          );

          //Lägg in logik för att skapa en member/membershipType
        }
      }
    });
  };
  console.log("Membership:", membershipType);

  const toLoggedin = () => {
    FlowRouter.go("/LoggedIn");
  };

  return !paymentApproved ? (
    <>
      <LanguageSwitcher />
      <div className="login-form">
        <h1>Betalning</h1>
        <h2>{membershipType.name}</h2>
        <p>{membershipType.description}</p>
        <h3>{membershipType.price}</h3>
        <button onClick={() => handlePayment(membershipType.price)}>
          Slutför betalning
        </button>
      </div>
    </>
  ) : (
    <div>
      <h1>Betalning godkänd!</h1>
      <p>Tack för din betalning.</p>
      <button onClick={toLoggedin}>Log in</button>
    </div>
  );
};
