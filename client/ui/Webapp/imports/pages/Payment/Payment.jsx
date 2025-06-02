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
  const [intervalId, setIntervalId] = useState(null);
  const [member_Id, setMember_Id] = useState({});
  const [qrSrc, showQrSrc] = useState(null);
  const [swishId, setSwishId] = useState(null);
  const { t } = useTranslation();
  const [swishDevice, setSwishDevice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
  const handlePayment = async (price, SwishOnThisDevice) => {
    const price1 = price.match(/^\d+/)?.[0];
    Meteor.call(
      "swish.createTestPayment",
      price1,
      membershipType.name,
      async (err, res) => {
        if (err) {
          console.error("Error:", err);
        } else {
          console.log("Got token:", res.paymentrequesttoken);
          setSwishId(res.instructionId);
          if (SwishOnThisDevice) {
            setSwishDevice(true);
            await openSwish(res.paymentrequesttoken);
          } else {
            await generateQrCode(res.paymentrequesttoken);
            setIsLoading(true);
          }
          const id = setInterval(() => {
            checkIfapproved(res.instructionId);
          }, 4000); // Kör var 4:e sekund
          setIntervalId(id);
        }
      }
    );
    Meteor.call(
      "swish.createTestPayment",
      price1,
      membershipType.name,
      async (err, res) => {
        if (err) {
          console.error("Error:", err);
        } else {
          console.log("Got token:", res.paymentrequesttoken);
          setSwishId(res.instructionId);
          if (SwishOnThisDevice) {
            setSwishDevice(true);
            await openSwish(res.paymentrequesttoken);
          } else {
            await generateQrCode(res.paymentrequesttoken);
            setIsLoading(true);
          }
          const id = setInterval(() => {
            checkIfapproved(res.instructionId);
          }, 4000); // Kör var 4:e sekund
          setIntervalId(id);
        }
      }
    );
  };

  const openSwish = (token) => {
    const callback = Meteor.settings.swishCallback;
    const swishUrl = `swish://paymentrequest?token=${token}&callbackurl=${callback}/Payment`; //Annan callback senare
    window.location.href = swishUrl;
  };

  const generateQrCode = (token) => {
    Meteor.call("getQrCode", token, (err, qrUrl) => {
      if (err) {
        console.error("Error fetching QR code:", err);
      } else {
        console.log("new QR");
        showQrSrc(qrUrl);
      }
    });
  };
  console.log(membershipType.name);
  const checkIfapproved = async (instructionId) => {
    Meteor.call("getPaymentStatus", instructionId, (err, res) => {
      console.log("Resultat", res);
      if (err) {
        console.error("Error:", err);
      } else {
        if (res === true) {
          clearInterval(intervalId);
          FlowRouter.go("/Confirmation");
        }
      }
    });
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
        {qrSrc ? (
          <div style={{ marginTop: 20 }}>
            <h3 className="scanQRh3">{t("ScanQrCode")} </h3>
            <img
              src={qrSrc}
              alt="Swish QR Code"
              width={300}
              height={300}
              className="swish-qr"
            />
            <button className="loadingButton" disabled={isLoading}>
              {isLoading ? <div className="loader"></div> : t("CheckPayment")}
            </button>
          </div>
        ) : (
          <>
            <h1>{t("Payment")}</h1>
            <h2>{membershipType.name}</h2>
            <p>{membershipType.description}</p>
            <h3>{membershipType.price}</h3>
            <div className="login-form">
              <button
                style={{ width: "100%" }}
                onClick={() => handlePayment(membershipType.price, true)}
                className="finishButton"
              >
                <img
                  src="/icons/smartphone-icon-with-transparent-background-free-png.webp"
                  className="deviceIcon"
                />

                <img
                  src="/icons/pngtree-laptop-icon-png-image_6606927.png"
                  className="deviceIcon"
                />
                {t("SwishOnThisDevice")}
              </button>
              <br />
              <button
                style={{ width: "100%" }}
                onClick={() => handlePayment(membershipType.price, false)}
                className="finishButton"
              >
                {t("SwishOnOtherDevice")}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
