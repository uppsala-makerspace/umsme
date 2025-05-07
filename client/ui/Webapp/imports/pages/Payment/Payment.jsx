import { FlowRouter } from "meteor/ostrio:flow-router-extra";
import { updateMember } from "/lib/utils";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { useTranslation } from "react-i18next";
import "./payment.css";

export const Payment = () => {
  const user = useTracker(() => Meteor.user());

  const [membershipType, setMembershipType] = useState(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [member_Id, setMember_Id] = useState({});
  const [qrSrc, showQrSrc] = useState(null);
  const [swishId, setSwishId] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    const selectedMembership = Session.get("selectedMembership");
    if (selectedMembership) {
      setMembershipType(selectedMembership);
    } else {
      FlowRouter.go("/HandleMembership");
    }
  }, []);

  console.log("MembershipType:", membershipType);

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
  const handlePayment = async (price) => {
    const price1 = price.match(/^\d+/)?.[0];
    Meteor.call("swish.createTestPayment", price1, async (err, res) => {
      if (err) {
        console.error("Error:", err);
      } else {
        console.log("Got token:", res.paymentrequesttoken);
        setSwishId(res.instructionId);
        await tryOpenSwishOrGenerateQrcode(res.paymentrequesttoken);
      }
    });
  };

  const checkIfapproved = async () => {
    Meteor.call(
      "getPaymentStatusAndInsertMembership",
      swishId,
      membershipType.name,
      (err, res) => {
        console.log(res);
        if (err) {
          console.error("Error:", err);
        } else {
          if (res === "PAID") {
            FlowRouter.go("LoggedInAsMember");
          }
        }
      }
    );
  };
  console.log("Membership:", membershipType);

  const tryOpenSwishOrGenerateQrcode = (token) => {
    const swishUrl = `swish://paymentrequest?token=${token}&callbackurl=https://50f4-31-209-41-143.ngrok-free.app/Payment`; //Annan callback senare
    const now = Date.now();
    window.location.href = swishUrl;
    setTimeout(() => {
      if (Date.now() - now < 3100) {
        Meteor.call("getQrCode", token, (err, qrUrl) => {
          if (err) {
            console.error("Error:", err);
          } else {
            showQrSrc(qrUrl);
          }
        });
      }
    }, 2000);
  };

  return (
    <>
      <LanguageSwitcher />
      <div
        style={{
          marginTop: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
        className="payment-container"
      >
        {paymentApproved ? (
          <div style={{ marginTop: 20 }}>
            <h3>{t("paymentApproved")}</h3>
            <p>{t("ThankPayment")}</p>
          </div>
        ) : qrSrc ? (
          <div style={{ marginTop: 20 }}>
            <h3 className="scanQRh3">{t("ScanQrCode")} </h3>
            <img
              src={qrSrc}
              alt="Swish QR Code"
              width={300}
              height={300}
              className="swish-qr"
            />
            <button
              onClick={checkIfapproved}
              style={{ marginTop: 10 }}
              className="finishButton"
            >
              {t("CheckPayment")}
            </button>
          </div>
        ) : (
          <>
            <h1>{t("Payment")}</h1>
            <h2>{membershipType.name}</h2>
            <p>{membershipType.description}</p>
            <h3>{membershipType.price}</h3>
            <button
              onClick={() => handlePayment(membershipType.price)}
              className="finishButton"
            >
              {t("FinishPayment")}
            </button>
          </>
        )}
      </div>
    </>
  );
};
