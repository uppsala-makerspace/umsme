import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LoggedIn = () => {
    const user = Meteor.user();
    const navigate = useNavigate();
    const logout = () => {
        Meteor.logout((err) => {
            if (err) {
                console.error('Logout error:', err);
            } else {
                navigate('/login'); // Redirect to the login page
            }
        });
    };
    return (
        <div>
            <h1>Welcome Back!</h1>
            <p>You are successfully logged in.</p>

            <div className='user' onClick={logout}>
                {user.username}
            </div>
        </div>
    );
};

