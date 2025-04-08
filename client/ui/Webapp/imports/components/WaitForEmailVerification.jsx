import React, { useState } from 'react';

export const WaitForEmailVerification = () => {
    const user = Meteor.user();

  return (
    <div className="wait-for-verification">
      <h1>Vänligen verifiera din e-postadress</h1>
    </div>
  );
}