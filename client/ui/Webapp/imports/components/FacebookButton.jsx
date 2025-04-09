import React from "react";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { useTracker } from "meteor/react-meteor-data";

export const FacebookButton = () => {
    const user = useTracker(() => Meteor.user());

    const configurationExists = () => {
        return ServiceConfiguration.configurations.findOne({
            service: 'facebook'
        });
    };

    const loading = false;
    const isDisabled = loading || !configurationExists();
    const buttonText = isDisabled ? 'Please wait' : 'Continue with Facebook';

    const handleClick = () => {
        Meteor.loginWithFacebook({}, (err) => {
            Meteor.logout();
            if (err) {
                console.error("Facebook login failed", err);
            } else {
                console.log("Facebook login successful");
                FlowRouter.go("/loggedIn"); 
            }

    });

}
return (
    <button disabled={isDisabled} onClick={handleClick}>
      {buttonText}
    </button>
)
}