import React, { Component } from 'react';
import { Collapse, Navbar, NavbarBrand, NavbarToggler, NavItem, NavLink, NavbarText } from 'reactstrap'; // Added NavbarText for cart count
import { Link } from 'react-router-dom';
import './NavMenu.css';
// import { GoPersonFill } from "react-icons/go"; // No longer used directly in JSX
import { IoMdCart } from "react-icons/io"; // Still used for cart icon

export class NavMenu extends Component {
  static displayName = NavMenu.name;

  constructor(props) {
    super(props);

    this.toggleNavbar = this.toggleNavbar.bind(this);
    this.state = {
      collapsed: true,
      cartItemCount: 0, // Placeholder for dynamic cart count
    };
  }

  toggleNavbar() {
    this.setState({
      collapsed: !this.state.collapsed
    });
  }

  // In a real application, you'd fetch the cart count here
  // For now, it remains static or is updated via a global state management solution.
  // componentDidMount() {
  //   this.fetchCartItemCount();
  // }

  // async fetchCartItemCount() {
  //   try {
  //     const response = await fetch('/api/carts/', { credentials: 'include' });
  //     if (response.ok) {
  //       const data = await response.json();
  //       if (data.length > 0 && data[0].items) {
  //         const count = data[0].items.reduce((sum, item) => sum + item.quantity, 0);
  //         this.setState({ cartItemCount: count });
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Failed to fetch cart count:", error);
  //   }
  // }


  render() {
    const { cartItemCount } = this.state; // Destructure cartItemCount from state

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
              {/* Login and Signup Links */}
              <NavItem>
                <NavLink tag={Link} className="text-dark" to="/login">Login</NavLink>
              </NavItem>
              <NavItem>
                <NavLink tag={Link} className="text-dark" to="/signup">Sign Up</NavLink>
              </NavItem>
              {/* Cart Link with Icon and Placeholder Count */}
              <NavItem className="ms-auto"> {/* ms-auto pushes this item to the right */}
                <NavLink tag={Link} className="text-dark" to="/cart">
                  <div className="d-flex align-items-center">
                    <IoMdCart className="me-1" size={20} /> {/* Cart Icon */}
                    Cart
                    <span className="badge bg-dark text-white ms-1 rounded-pill">{cartItemCount}</span> {/* Dynamic count placeholder */}
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
