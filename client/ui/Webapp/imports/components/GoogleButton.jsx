import React from "react";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { useTracker } from "meteor/react-meteor-data";


export const GoogleButton = () =>{
    const user = useTracker(() => Meteor.user());

    const configurationExists = () => {        
        return ServiceConfiguration.configurations.findOne({
          service: 'google'
        });      
    };

    const loading = false;
    const isDisabled = loading || !configurationExists();
    const buttonText = isDisabled ? 'Please wait' : 'Continue with Google';
    
    const handleClick = () => {
        Meteor.loginWithGoogle({}, (err) => {
            if (err) {
                console.error("Google login failed", err);
            } else {
                const user = Meteor.user();
                FlowRouter.go("/loggedIn"); 
            }

    });

}

return (
    <button disabled={isDisabled} onClick={handleClick}>
      <img src="/images/GoogleLogo.png" alt="icon" className="button-icon" />
      {buttonText}
    </button>
  );

}