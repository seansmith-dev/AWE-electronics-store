import React, { Component } from 'react';
import { Collapse, Navbar, NavbarBrand, NavbarToggler, NavItem, NavLink, NavbarText } from 'reactstrap';
import { useLocation, Link } from 'react-router-dom';

import './NavMenu.css';
import { IoMdCart } from "react-icons/io";

// Helper function to get a cookie by name (needed for CSRF token for logout)
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

export class NavMenu extends Component {
    static displayName = NavMenu.name;

    constructor(props) {
        super(props);

        this.toggleNavbar = this.toggleNavbar.bind(this);
        this.state = {
            collapsed: true,
            cartItemCount: 0,
            isAuthenticated: false, // New state to track authentication status
            username: '', // To display logged-in username
        };
    }

    componentDidMount() {
        this.checkAuthStatus(); // Check authentication status on component mount
        this.fetchCartItemCount(); // Fetch cart count
        document.addEventListener('cart-updated', this.fetchCartItemCount);
    }

    componentWillUnmount() {
      document.removeEventListener('cart-updated', this.fetchCartItemCount);
    }
    
    componentDidUpdate(prevProps) {
      if (this.props.location.pathname !== prevProps.location.pathname) {
        this.checkAuthStatus();
        this.fetchCartItemCount();
      }
    }
    /**
     * Checks the user's authentication status by calling a backend endpoint.
     */
    checkAuthStatus = async () => {
        try {
            // Use the proxy for the API call
            const response = await fetch('/api/users/current_user/', { credentials: 'include' }); 
            if (response.ok) {
                const userData = await response.json();
                this.setState({ isAuthenticated: true, username: userData.username });
            } else {
                this.setState({ isAuthenticated: false, username: '' });
            }
        } catch (error) {
            console.error("Error checking authentication status:", error);
            this.setState({ isAuthenticated: false, username: '' });
        }
    };

    /**
     * Handles user logout.
     */
    handleLogout = async () => {
        const csrftoken = getCookie('csrftoken');
        if (!csrftoken) {
            alert('CSRF token not found. Cannot log out.');
            return;
        }

        try {
            // Use the proxy for the API call
            const response = await fetch('/api/users/logout/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                },
                credentials: 'include' 
            });

            if (response.ok) {
                console.log('Logout successful!');
                this.setState({ isAuthenticated: false, username: '', cartItemCount: 0 });
                // Optionally, redirect to home or login page after logout
                // window.location.href = '/login'; // Or use react-router-dom's navigate if NavMenu was a functional component
            } else {
                const errorData = await response.json();
                alert(`Logout failed: ${errorData.detail || response.statusText}`);
            }
        } catch (error) {
            console.error("Error during logout:", error);
            alert(`Logout failed: ${error.message}`);
        }
    };

    toggleNavbar() {
        this.setState({
            collapsed: !this.state.collapsed
        });
    }

    /**
     * Fetches the current number of items in the user's cart.
     */
    fetchCartItemCount = async () => {
        try {
            // Use the proxy for the API call
            const response = await fetch('/api/carts/', {credentials: 'include'});
            if (response.ok) {
                const data = await response.json();
                if (data.length > 0 && data[0].items) {
                    const count = data[0].items.reduce((sum, item) => sum + item.quantity, 0);
                    this.setState({ cartItemCount: count });
                } else {
                    this.setState({ cartItemCount: 0 });
                }
            } else {
                // If cart fetch fails (e.g., no session, or permission issue), default to 0
                this.setState({ cartItemCount: 0 });
            }
        } catch (error) {
            console.error("Failed to fetch cart count:", error);
            this.setState({ cartItemCount: 0 });
        }
    };


    render() {
        const { cartItemCount, isAuthenticated, username } = this.state;

        return (
            <header>
                <Navbar className="navbar-expand-sm navbar-toggleable-sm ng-white border-bottom box-shadow mb-3" container light>
                    <NavbarBrand tag={Link} to="/">AWE Electronics</NavbarBrand>
                    <NavbarToggler onClick={this.toggleNavbar} className="mr-2" />
                    <Collapse className="d-sm-inline-flex flex-sm-row-reverse" isOpen={!this.state.collapsed} navbar>
                        <ul className="navbar-nav flex-grow">
                            <NavItem>
                                <NavLink tag={Link} className="text-dark" to="/">Home</NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink tag={Link} className="text-dark" to="/shop">Shop</NavLink>
                            </NavItem>

                            {isAuthenticated ? (
                                <>
                                    <NavbarText className="text-dark ms-auto me-2">
                                        Welcome, {username}!
                                    </NavbarText>
                                    <NavItem>
                                        <NavLink className="text-dark" onClick={this.handleLogout} style={{ cursor: 'pointer' }}>
                                            Logout
                                        </NavLink>
                                    </NavItem>
                                </>
                            ) : (
                                <>
                                    <NavItem>
                                        <NavLink tag={Link} className="text-dark" to="/login">Login</NavLink>
                                    </NavItem>
                                    <NavItem>
                                        <NavLink tag={Link} className="text-dark" to="/signup">Sign Up</NavLink>
                                    </NavItem>
                                </>
                            )}

                            {/* Cart Link with Icon and Dynamic Count */}
                            <NavItem className="ms-auto">
                                <NavLink tag={Link} className="text-dark" to="/cart">
                                    <div className="d-flex align-items-center">
                                        <IoMdCart className="me-1" size={20} />
                                        Cart
                                        <span className="badge bg-dark text-white ms-1 rounded-pill">{cartItemCount}</span>
                                    </div>
                                </NavLink>
                            </NavItem>
                        </ul>
                    </Collapse>
                </Navbar>
            </header>
        );
    }
}
function NavMenuWithLocation(props) {
  const location = useLocation();
  return <NavMenu {...props} location={location} />;
}

export default NavMenuWithLocation;