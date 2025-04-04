import React, { useState, Fragment } from 'react';
import { useTracker, useSubscribe } from "meteor/react-meteor-data";
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { LoggedIn } from '../components/LoggedIn';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


// Exempel på funktionell komponent
const App = () => {

        return (
            <Router>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/register" element={<RegisterForm />} />
                    <Route path="/login" element={<LoginForm/>}/>
                    <Route path="/loggedIn" element={<LoggedIn />} />
                </Routes>
            </Router>
        );
      };
  
  export default App;
  
