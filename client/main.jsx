import { Meteor } from 'meteor/meteor';
import React from 'react';
import App from './ui/Webapp/imports/layouts/App.jsx';
import './main.html';
import { createRoot } from 'react-dom/client';



Meteor.startup(() => {
  console.log("Meteor startup running...");
  
  const container = document.getElementById('react-target');
  console.log("Container:", container);

  if (!container) {
    console.error("❌ ERROR: 'react-target' not found!");
    return;
  }

  const root = createRoot(container); 
  root.render(<App />);
});
