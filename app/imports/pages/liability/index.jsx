import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Liability from "./Liability";

export default () => {
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [document, setDocument] = useState(null);
  const [approvedDate, setApprovedDate] = useState(null);

  useEffect(() => {
    if (!user) return;

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

        // Fetch member info to get approved liability date
        const info = await Meteor.callAsync("findInfoForUser");
        if (info?.liabilityDate) {
          setApprovedDate(new Date(info.liabilityDate));
        }
      } catch (error) {
        console.error("Error fetching liability data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?._id]);

  const handleApprove = async () => {
    if (!document?.date) return;

    setApproving(true);
    try {
      await Meteor.callAsync("approveLiability", document.date);
      setApprovedDate(new Date(document.date));
    } catch (error) {
      console.error("Error approving liability:", error);
    } finally {
      setApproving(false);
    }
  };

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
