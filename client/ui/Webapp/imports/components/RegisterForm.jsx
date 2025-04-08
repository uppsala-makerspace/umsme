import React, { useState } from 'react';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { LanguageSwitcher } from './langueSwitcher';

export const RegisterForm = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        console.log('Username:', username);
        console.log('Password:', password);
        console.log('Email:', email);
        if (password === confirmPassword){
            Accounts.createUser({ username, password, email }, (err) => {
                FlowRouter.go('/waitForEmailVerification'); 
            });
            
        }
        else {
            console.error('Passwords do not match');
            alert('Passwords do not match'); 
        }     
    };

    const toLogIn = () => {
        FlowRouter.go('/login'); // Redirect to the login page
    }

    return (
        <>
        <LanguageSwitcher />
        <img src="/images/UmLogo.png" alt="UM Logo" className="login-logo"/>
        <p style={{ textAlign: "center" }}> Om du har ett konto så ska du logga in med samma mejl som du använt</p>
        <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
            </div>
            <div>
                <label htmlFor="email">Email:</label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    />
            </div>
            <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>
            <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password:</label>
                <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>
            <button type="submit" className="form-button">Register</button>
            <button onClick={() => toLogIn()}>Back to Login</button>
        </form>
        </>
    );
};

