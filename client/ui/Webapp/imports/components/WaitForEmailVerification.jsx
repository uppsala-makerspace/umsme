import React, { useState } from 'react';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';


export const WaitForEmailVerification = () => {
    const user = Meteor.user();

    const toLogIn = () => {
        FlowRouter.go('/login');
    }

  return (
    <div className="wait-for-verification">
      <h1>Vänligen verifiera din e-postadress</h1>
      <button onClick={() => toLogIn()}>Back to Login</button>
    </div>
  );
}