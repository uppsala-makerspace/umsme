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
  const [member_Id, setMember_Id] = useState({});

  useEffect(() => {
    const selectedMembership = Session.get("selectedMembership");
    if (selectedMembership) {
      setMembershipType(selectedMembership);
    } else {
      FlowRouter.go("/HandleMembership");
    }
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      if (user._id) {
        try {
          const { member: m } = await Meteor.callAsync("findInfoForUser");
          console.log("memberrrr:", m);
          // setIsLoading(false);
          setMember_Id(m._id);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };

    fetchData();
  }, [user?._id]);

  if (!membershipType) {
    return <div>Laddar...</div>;
  }
  const handlePayment = (price) => {
    const price1 = price.match(/^\d+/)?.[0];
    Meteor.call("swish.createTestPayment", price1, (err, res) => {
      if (err) {
        alert("Fel: " + err.reason);
      } else {
        console.log("Initiated payment with Id:", res);
        Meteor.call("getPaymentStatusAndInsertMembership", res, (err, status) => {
          if(err){
            console.error(err)
          }
          else{
            console.log("PaymentStatus", status)
            setPaymentApproved(true);
          }
        })
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
