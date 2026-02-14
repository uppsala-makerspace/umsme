import { Meteor } from "meteor/meteor";
import React, { useState, useEffect, useContext } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Liability from "./Liability";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";

export default () => {
  const { memberInfo, refetch } = useContext(MemberInfoContext);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [document, setDocument] = useState(null);

  useEffect(() => {
    if (!memberInfo) return;

    const fetchData = async () => {
      try {
        // Fetch the list of liability documents to get the latest one
        const documents = await Meteor.callAsync("liabilityDocumentsList");
        if (documents && documents.length > 0) {
          const latestDoc = documents[0]; // Already sorted by date desc
          // Fetch the full document
          const fullDoc = await Meteor.callAsync("liabilityDocumentByDate", latestDoc.date);
          setDocument(fullDoc);
        }
      } catch (error) {
        console.error("Error fetching liability data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [memberInfo?.member?._id]);

  const handleApprove = async () => {
    if (!document?.date) return;

    setApproving(true);
    try {
      await Meteor.callAsync("approveLiability", document.date);
      await refetch();
    } catch (error) {
      console.error("Error approving liability:", error);
    } finally {
      setApproving(false);
    }
  };

  const approvedDate = memberInfo?.liabilityDate ? new Date(memberInfo.liabilityDate) : null;

  return (
    <Layout>
      {!Meteor.userId() ? <Navigate to="/login" /> : null}
      <Liability
        documentDate={document?.date ? new Date(document.date) : null}
        text={document?.text}
        approvedDate={approvedDate}
        loading={loading}
        approving={approving}
        onApprove={handleApprove}
      />
    </Layout>
  );
};
