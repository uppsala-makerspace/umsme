import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const RegisterForm = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();
    

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Username:', username);
        console.log('Password:', password);
        // Add your registration logic here
        if (password === confirmPassword){
            Accounts.createUser({ username, password }, (err) => {
                if (err) {
                    console.error('Registration error:', err);
                } else {
                    console.log('User registered successfully!');
                    // Optionally redirect or show a success message
                    navigate('/loggedIn'); // Redirect to the login page
                }
            });
        }
        else {
            console.error('Passwords do not match');
            alert('Passwords do not match'); 
        }     
    };

    const toLogIn = () => {
        navigate('/login'); // Redirect to the login page
    }

    return (
        <>
        <p> Om du har ett konto så ska du logga in med samma mejl som du använt</p>
        <form onSubmit={handleSubmit}>
            <div>
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
                <label htmlFor="password">Password:</label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>
            <div>
                <label htmlFor="confirm-password">Confirm Password:</label>
                <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>
            <button type="submit">Register</button>
            <button onClick={() => toLogIn()}>Back to Login</button>
        </form>
        </>
    );
};

