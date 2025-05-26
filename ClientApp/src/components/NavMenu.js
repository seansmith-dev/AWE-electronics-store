import React, { Component } from 'react';
import { Collapse, Navbar, NavbarBrand, NavbarToggler, NavItem, NavLink } from 'reactstrap';
import { Link } from 'react-router-dom';
import './NavMenu.css';
import { GoPersonFill } from "react-icons/go";
import { IoMdCart } from "react-icons/io";

export class NavMenu extends Component {
  static displayName = NavMenu.name;

  constructor(props) {
    super(props);

    this.toggleNavbar = this.toggleNavbar.bind(this);
    this.state = {
      collapsed: true
    };
  }

  toggleNavbar() {
    this.setState({
      collapsed: !this.state.collapsed
    });
  }

  render() {
    return (
      <header>
        <Navbar className="navbar-expand-sm navbar-toggleable-sm ng-white border-bottom box-shadow" container light>
          <div className="d-flex align-items-center">
            <NavbarBrand tag={Link} to="/">AWE Electronics</NavbarBrand>
            <div className="d-none d-sm-flex">
              <NavItem>
                <NavLink tag={Link} className="text-dark nav-link-before-hover nav-link-hover" to="/">
                  <div className="nav-link__container">
                    <span className="nav__text">Home</span>
                  </div>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink tag={Link} className="text-dark nav-link-before-hover nav-link-hover" to="/">
                  <div className="nav-link__container">
                    <span className="nav__text">Sign In</span>
                  </div>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink tag={Link} className="text-dark nav-link-before-hover nav-link-hover" to="/shop">
                  <div className="nav-link__container">
                    <span className="nav__text">Shop</span>
                  </div>
                </NavLink>
              </NavItem>
            </div>
          </div>

          <NavbarToggler onClick={this.toggleNavbar} className="mr-2" />
          
          <Collapse className="d-sm-inline-flex flex-sm-row-reverse" isOpen={!this.state.collapsed} navbar>
            <ul className="navbar-nav flex-grow">
              {/* Mobile navigation items */}
              <div className="d-sm-none">
                <NavItem>
                  <NavLink tag={Link} className="text-dark" to="/">
                    <div className="nav-link__container">
                      <span className="nav__text">Home</span>
                    </div>
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink tag={Link} className="text-dark" to="/">
                    <div className="nav-link__container">
                      <span className="nav__text">Sign In</span>
                    </div>
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink tag={Link} className="text-dark" to="/shop">
                    <div className="nav-link__container">
                      <span className="nav__text">Shop</span>
                    </div>
                  </NavLink>
                </NavItem>
              </div>

              {/* Right side cart */}
              <div className="ms-auto">
                <NavItem>
                  <NavLink tag={Link} className="text-dark" to="/">
                    <div className="nav-link__container">
                      <form className="d-flex">
                        <button className="btn btn-outline-white" type="submit">
                          <i className="bi-cart-fill me-1"></i>
                          Cart
                          <span className="badge bg-dark text-white ms-1 rounded-pill margin--left">0</span>
                        </button>
                      </form>
                    </div>
                  </NavLink>
                </NavItem>
              </div>
            </ul>
          </Collapse>
        </Navbar>
      </header>
    );
  }
}
