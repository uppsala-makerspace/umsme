import React from 'react';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

export const LoggedIn = () => {
  const user = Meteor.user();
  const logout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      } else {
        FlowRouter.go('/login'); // Redirect to the login page
      }
    });
  };
  return (
    <div>
      <h1>Welcome Back!</h1>
      <p>You are successfully logged in.</p>

      <div className='user'>
        {user.username}
      </div>
      <button onClick={logout}>
        Logout
      </button>
    </div>
  );
};

