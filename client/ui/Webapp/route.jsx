import { Meteor } from 'meteor/meteor';
import React, {useState} from 'react';
import './main.html';
import { createRoot } from 'react-dom/client';
import '/client/ui/admin';

let _uiComponent;
let _setUIComponent;
export default (uiName, uiComponent) => {
  _uiComponent = uiComponent;
  if (_setUIComponent) {
    _setUIComponent(uiName);
  }
};

const App = () => {
  const [ui, setUI] = useState('initial');
  _setUIComponent = setUI;
  return _uiComponent ? <_uiComponent></_uiComponent> : <div></div>;
};

Meteor.startup(() => {
  console.log("Meteor startup running...webapp");

  const container = document.getElementById('react-target');
  // Express all umsapp specific CSS with selectors starting with
  // the class 'umsapp' to avoid conflicting with admin UI.
  container.classList.add('umsapp');

  const root = createRoot(container);
  root.render(<App/>);
});
