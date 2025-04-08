import { Meteor } from "meteor/meteor";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect } from "react";
import "../Appmain.css";

export const emailVerified = () => {


    return (
        <div className="email-verified-container">
            <p>Your email has been successfully verified. You can now log in.</p>
        </div>
    );
}