import React, { useState, Fragment } from 'react';
import { useTracker, useSubscribe } from "meteor/react-meteor-data";
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';

// Exempel på funktionell komponent
const App = () => {
    const user = useTracker(() => Meteor.user());
    const logout = () => Meteor.logout();

    const [showRegister, setShowRegister] = useState(false);

    return (
        <>
        {user ? (
        <Fragment>
            <div>you are logged in</div>
            <div className="user" onClick={logout}>
                    {user.username} 🚪Log out
                  </div>
        </Fragment>
      ) : (
        <div>
        {showRegister ? (
            <>
                <RegisterForm /> {/* Visa registreringsformuläret */}
                <button onClick={() => setShowRegister(false)}>Go to Login</button>
            </>
        ) : (
            <>
                <LoginForm /> {/* Visa inloggningsformuläret */}
                <button onClick={() => setShowRegister(true)}>Register</button>
            </>
        )}
    </div>          )}
          </>
      );
  };
  
  export default App;
  
