import React, { Component } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css'; // You might want to create a shared CSS file for auth forms

// Helper function to get a cookie by name (needed for CSRF token)
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Wrapper component to use useNavigate hook with a class component
function SignupWrapper() {
    const navigate = useNavigate();
    return <Signup navigate={navigate} />;
}

export class Signup extends Component {
    static displayName = Signup.name;

    constructor(props) {
        super(props);
        this.state = {
            username: '',
            email: '',
            password: '',
            phone_number: '',
            delivery_address: '',
            error: null,
            loading: false,
            success: false,
        };
    }

    handleInputChange = (event) => {
        const { id, value } = event.target;
        this.setState({ [id]: value });
    };

    handleSubmit = async (event) => {
        event.preventDefault();
        this.setState({ loading: true, error: null, success: false });
        const { navigate } = this.props; // Access navigate from props
        const { username, email, password, phone_number, delivery_address } = this.state;

        const csrftoken = getCookie('csrftoken'); // Get CSRF token

        try {
            const response = await fetch('/api/users/', { // Your UserViewSet create endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken, // Include CSRF token for POST
                },
                credentials: 'include', // Send session cookies
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    phone_number,
                    delivery_address,
                    user_type: 'customer' // Automatically set new users as 'customer'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                // Handle specific Django REST Framework validation errors
                let errorMessage = 'Registration failed.';
                if (errorData.username) errorMessage += ` Username: ${errorData.username.join(', ')}`;
                if (errorData.email) errorMessage += ` Email: ${errorData.email.join(', ')}`;
                if (errorData.password) errorMessage += ` Password: ${errorData.password.join(', ')}`;
                if (errorData.non_field_errors) errorMessage += ` ${errorData.non_field_errors.join(', ')}`;
                if (errorData.detail) errorMessage = errorData.detail; // General error detail

                throw new Error(errorMessage);
            }

            console.log('Registration successful!');
            this.setState({ success: true });
            alert('Registration successful! Please log in.'); // Using alert for simplicity
            navigate('/login'); // Redirect to login page after successful registration

        } catch (error) {
            console.error('Registration error:', error);
            this.setState({ error: error.message });
        } finally {
            this.setState({ loading: false });
        }
    };

    render() {
        const { username, email, password, phone_number, delivery_address, error, loading, success } = this.state;

        return (
            <div className="auth-container">
                <div className="auth-form-card">
                    <h2 className="auth-heading">Sign Up</h2>
                    <form onSubmit={this.handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                className="form-control"
                                value={username}
                                onChange={this.handleInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                className="form-control"
                                value={email}
                                onChange={this.handleInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                className="form-control"
                                value={password}
                                onChange={this.handleInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone_number">Phone Number (Optional)</label>
                            <input
                                type="text"
                                id="phone_number"
                                className="form-control"
                                value={phone_number}
                                onChange={this.handleInputChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="delivery_address">Delivery Address (Optional)</label>
                            <textarea
                                id="delivery_address"
                                className="form-control"
                                value={delivery_address}
                                onChange={this.handleInputChange}
                                rows="3"
                            ></textarea>
                        </div>
                        {error && <p className="error-message">{error}</p>}
                        {success && <p className="success-message">Registration successful!</p>}
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? 'Signing Up...' : 'Sign Up'}
                        </button>
                    </form>
                    <p className="auth-link-text">
                        Already have an account? <Link to="/login">Login</Link>
                    </p>
                </div>
            </div>
        );
    }
}

export default SignupWrapper; // Export the wrapper component
