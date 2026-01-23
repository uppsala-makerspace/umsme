import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import Storage from "./Storage";

export default () => {
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [storageData, setStorageData] = useState({
    storage: null,
    storagequeue: null,
    storagerequest: null,
    hasLabMembership: false,
  });

  useEffect(() => {
    if (!user) return;

    const fetchStorageData = async () => {
      try {
        const result = await Meteor.callAsync("storage");
        if (result) {
          setStorageData(result);
        }
      } catch (error) {
        console.error("Error fetching storage data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStorageData();
  }, [user?._id]);

  const handleQueueForBox = async () => {
    try {
      await Meteor.callAsync("updateStorage", { storagequeue: true });
      setStorageData((prev) => ({ ...prev, storagequeue: true }));
    } catch (error) {
      console.error("Error queuing for box:", error);
      throw error;
    }
  };

  const handleSubmitRequest = async (storagerequest) => {
    try {
      await Meteor.callAsync("updateStorage", { storagerequest });
      setStorageData((prev) => ({ ...prev, storagerequest }));
    } catch (error) {
      console.error("Error submitting request:", error);
      throw error;
    }
  };

  const handleCancelQueue = async () => {
    try {
      await Meteor.callAsync("updateStorage", { storagequeue: false, storagerequest: null });
      setStorageData((prev) => ({ ...prev, storagequeue: false, storagerequest: null }));
    } catch (error) {
      console.error("Error canceling queue:", error);
      throw error;
    }
  };

  return (
    <>
      {!Meteor.userId() ? <Navigate to="/login" /> : null}
      <TopBar />
      <Storage
        storage={storageData.storage}
        storagequeue={storageData.storagequeue}
        storagerequest={storageData.storagerequest}
        hasLabMembership={storageData.hasLabMembership}
        loading={loading}
        onQueueForBox={handleQueueForBox}
        onSubmitRequest={handleSubmitRequest}
        onCancelQueue={handleCancelQueue}
      />
      <BottomNavigation />
    </>
  );
};
