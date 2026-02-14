import React, { createContext, useState, useEffect, useCallback } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { Meteor } from "meteor/meteor";

export const AppDataContext = createContext({
  paymentOptions: null,
  doors: null,
  isAdmin: false,
  loading: true,
});

export const AppDataProvider = ({ children }) => {
  const user = useTracker(() => Meteor.user());
  const userId = user?._id;
  const [paymentOptions, setPaymentOptions] = useState(null);
  const [doors, setDoors] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPaymentOptions(null);
      setDoors(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      try {
        // Sequential calls to avoid DDP login race condition
        const options = await Meteor.callAsync("payment.getOptions");
        if (cancelled) return;
        setPaymentOptions(options || []);

        const doorsResult = await Meteor.callAsync("availableDoors");
        if (cancelled) return;
        setDoors(doorsResult);

        const admin = await Meteor.callAsync("checkIsAdmin");
        if (cancelled) return;
        setIsAdmin(admin);
      } catch (error) {
        console.error("AppDataContext: Error fetching app data:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAll();

    return () => { cancelled = true; };
  }, [userId]);

  return (
    <AppDataContext.Provider value={{ paymentOptions, doors, isAdmin, loading }}>
      {children}
    </AppDataContext.Provider>
  );
};
