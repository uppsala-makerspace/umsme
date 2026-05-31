import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import TestRunner from "./TestRunner.jsx";

export default () => {
  const { certificateId } = useParams();
  const navigate = useNavigate();
  const user = useTracker(() => Meteor.user());

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [maxErrors, setMaxErrors] = useState(0);
  const [result, setResult] = useState(null);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await Meteor.callAsync("tests.getStatus", certificateId);
      setMaxErrors(status.maxErrors);
      let session = await Meteor.callAsync("tests.resume", certificateId);
      if (!session) {
        session = await Meteor.callAsync("tests.start", certificateId);
      }
      setAttemptId(session.attemptId);
      setQuestions(session.questions);
    } catch (err) {
      console.error("Error starting test:", err);
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    if (!user) return;
    initialize();
  }, [user?._id, initialize]);

  const handleAnswer = async (questionId, optionId) => {
    try {
      await Meteor.callAsync("tests.answer", attemptId, questionId, optionId);
    } catch (err) {
      console.error("Error saving answer:", err);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await Meteor.callAsync("tests.submit", attemptId);
      setResult(res);
    } catch (err) {
      console.error("Error submitting test:", err);
      setError(err.reason || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => navigate(`/certificates/${certificateId}`);

  if (!Meteor.userId()) return <Navigate to="/login" />;

  return (
    <Layout>
      <TestRunner
        loading={loading}
        submitting={submitting}
        error={error}
        questions={questions}
        result={result}
        maxErrors={maxErrors}
        onAnswer={handleAnswer}
        onSubmit={handleSubmit}
        onBack={handleBack}
      />
    </Layout>
  );
};
