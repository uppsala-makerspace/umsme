import React, { useState, Fragment } from 'react';
import { useTracker, useSubscribe } from "meteor/react-meteor-data";
import { LoginForm } from './LoginForm';

// Exempel på funktionell komponent
const App = () => {
    return <div>Log the fuck in.   <LoginForm/> </div>
  
  };
  
  export default App;
  
