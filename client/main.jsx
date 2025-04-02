import React from 'react';
import ReactDOM from 'react-dom'; // Byt tillbaka till ReactDOM om du vill
import { Meteor } from 'meteor/meteor';
import App from './ui/App';
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

  const root = createRoot(container); // ✅ Korrekt sätt i React 18+
  root.render(<App />);
});
