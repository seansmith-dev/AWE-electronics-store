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
function LoginWrapper() {
    const navigate = useNavigate();
    return <Login navigate={navigate} />;
}

export class Login extends Component {
    static displayName = Login.name;

    constructor(props) {
        super(props);
        this.state = {
            username: '',
            password: '',
            error: null,
            loading: false,
            // New state to track if CSRF token has been fetched
            csrfTokenFetched: false, 
        };
    }

    componentDidMount() {
        // IMPORTANT: Make an initial GET request to the login endpoint
        // This will cause Django to set the csrftoken cookie for the current origin (localhost:3000)
        this.fetchCsrfToken();
    }

    fetchCsrfToken = async () => {
        try {
            // Make a GET request to the DRF login endpoint.
            // This request itself will not log in, but it will trigger Django
            // to set the csrftoken cookie in the browser for localhost:3000.
            const response = await fetch('/api-auth/login/', { credentials: 'include' });
            if (response.ok) {
                console.log('CSRF token fetched successfully (cookie should be set).');
                this.setState({ csrfTokenFetched: true });
            } else {
                console.error('Failed to fetch CSRF token:', response.status, response.statusText);
                this.setState({ error: 'Could not initialize login form. Please try refreshing.', csrfTokenFetched: false });
            }
        } catch (error) {
            console.error('Network error fetching CSRF token:', error);
            this.setState({ error: 'Network error. Please check your connection.', csrfTokenFetched: false });
        }
    };

    handleInputChange = (event) => {
        const { id, value } = event.target;
        this.setState({ [id]: value });
    };

    handleSubmit = async (event) => {
        event.preventDefault();
        this.setState({ loading: true, error: null });
        const { username, password, csrfTokenFetched } = this.state;
        const { navigate } = this.props; // Access navigate from props

        if (!csrfTokenFetched) {
            this.setState({ error: 'Login form not initialized. Please wait or refresh.' });
            this.fetchCsrfToken(); // Try fetching again
            return;
        }

        const csrftoken = getCookie('csrftoken'); // Get CSRF token after it should be set

        if (!csrftoken) {
            this.setState({ error: 'CSRF token not found. Please ensure cookies are enabled and refresh the page.' });
            this.fetchCsrfToken(); // Try fetching again
            return;
        }

        try {
            const response = await fetch('/api/users/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken, // Include CSRF token for POST requests
                },
                credentials: 'include', // Send session cookies
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();        // <= peek at this
                console.log(errorData);                    // usually {"detail": "Invalid credentials"}
                // Check if the error is specifically about CSRF token
                if (response.status === 403 && errorData.detail && errorData.detail.includes('CSRF Failed')) {
                    throw new Error('Login failed: CSRF token missing or incorrect. Please ensure you have cookies enabled and refresh the page if needed.');
                }
                throw new Error(errorData.detail || 'Login failed. Please check your credentials.');
            }

            // Login successful, redirect to a protected page (e.g., Shop or Cart)
            console.log('Login successful!');
            navigate('/shop'); // Redirect to the shop page after successful login

        } catch (error) {
            console.error('Login error:', error);
            this.setState({ error: error.message });
        } finally {
            this.setState({ loading: false });
        }
    };

    render() {
        const { username, password, error, loading, csrfTokenFetched } = this.state;

        return (
            <div className="auth-container">
                <div className="auth-form-card">
                    <h2 className="auth-heading">Login</h2>
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
                        {error && <p className="error-message">{error}</p>}
                        <button type="submit" className="auth-btn" disabled={loading || !csrfTokenFetched}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                    <p className="auth-link-text">
                        Don't have an account? <Link to="/signup">Sign Up</Link>
                    </p>
                </div>
            </div>
        );
    }
}

export default LoginWrapper; // Export the wrapper component
