import React, { Component } from 'react';
import './Checkout.css';
import { Link } from 'react-router-dom';

export class Checkout extends Component {
    static displayName = Checkout.name;

    render() {
        return (
            <div className="container">
                <h2 className="checkout-heading">Checkout</h2>
                <div className="checkout-container">
                    <div className="checkout-section">
                        <h3>Shipping Information</h3>
                        <form className="checkout-form">
                            <div className="form-group">
                                <label htmlFor="fullName">Full Name</label>
                                <input type="text" id="fullName" className="form-control" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="address">Address</label>
                                <input type="text" id="address" className="form-control" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="city">City</label>
                                <input type="text" id="city" className="form-control" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="postalCode">Postal Code</label>
                                <input type="text" id="postalCode" className="form-control" />
                            </div>
                        </form>
                    </div>
                    
                    <div className="checkout-section">
                        <h3>Payment Information</h3>
                        <form className="checkout-form">
                            <div className="form-group">
                                <label htmlFor="cardNumber">Card Number</label>
                                <input 
                                    type="text" 
                                    id="cardNumber" 
                                    className="form-control" 
                                    placeholder="1234 5678 9012 3456"
                                    maxLength="19"
                                />
                            </div>
                            <div className="payment-row">
                                <div className="form-group">
                                    <label htmlFor="expiryDate">Expiry Date</label>
                                    <input 
                                        type="text" 
                                        id="expiryDate" 
                                        className="form-control" 
                                        placeholder="MM/YY"
                                        maxLength="5"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="cvv">CVV</label>
                                    <input 
                                        type="text" 
                                        id="cvv" 
                                        className="form-control" 
                                        placeholder="123"
                                        maxLength="3"
                                    />
                                </div>
                            </div>
                        </form>

                        <h3 className="order-summary-heading">Order Summary</h3>
                        <div className="order-summary">
                            <div className="summary-row">
                                <span>Subtotal:</span>
                                <span>AU $1,599.98</span>
                            </div>
                            <div className="summary-row">
                                <span>GST (10%):</span>
                                <span>AU $145.45</span>
                            </div>
                            <div className="summary-row total">
                                <span>Total:</span>
                                <span>AU $1,745.43</span>
                            </div>
                        </div>
                        
                        <Link to="/purchaseConfirmation" className="place-order-btn">Order Item</Link>
                    </div>
                </div>
            </div>
        );
    }
}
