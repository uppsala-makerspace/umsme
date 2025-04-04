import React, { useState, Fragment } from 'react';
import { useTracker, useSubscribe } from "meteor/react-meteor-data";
import { LoginForm } from './LoginForm';

// Exempel på funktionell komponent
const App = () => {
    const user = useTracker(() => Meteor.user());
    const logout = () => Meteor.logout();

    return (
        <>
        
        {user ? (
        <Fragment>
            <div>you are logged in</div>
            <div className="user" onClick={logout}>
                    {user.username} 🚪
                  </div>
        </Fragment>
      ) : (
          <div> 
            <button className="language-switcher">
  <span className="language active">SV</span>
  <div className="divider"></div>
  <span className="language active">ENG</span>
</button>



           <LoginForm/> 
           </div>
          )}
          </>
      );
  };
  
  export default App;