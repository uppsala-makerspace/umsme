import { Meteor } from "meteor/meteor";
import React, { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Loader from "/imports/components/Loader/Loader";
import { AppDataContext } from "/imports/context/AppDataContext";
import { startImpersonation } from "/imports/lib/impersonation";
import Impersonate from "./Impersonate.jsx";

export default () => {
  const navigate = useNavigate();
  const { canImpersonate, loading } = useContext(AppDataContext);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [switchingTo, setSwitchingTo] = useState(null);
  const [error, setError] = useState(null);

  if (!Meteor.userId()) return <Navigate to="/login" />;
  if (loading) {
    return (
      <Layout bottomNav={false}>
        <Loader />
      </Layout>
    );
  }
  if (!canImpersonate) return <Navigate to="/" />;

  const search = async () => {
    setSearching(true);
    setError(null);
    try {
      setResults(await Meteor.callAsync("impersonation.search", query));
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setSearching(false);
    }
  };

  const switchTo = async (result) => {
    setSwitchingTo(result.userId);
    setError(null);
    try {
      await startImpersonation(result.userId);
      navigate("/");
    } catch (err) {
      setError(err.reason || err.message);
      setSwitchingTo(null);
    }
  };

  return (
    <Layout bottomNav={false}>
      <Impersonate
        query={query}
        onQueryChange={setQuery}
        onSearch={search}
        searching={searching}
        results={results}
        error={error}
        switchingTo={switchingTo}
        onSwitch={switchTo}
      />
    </Layout>
  );
};
