import React, { Component } from 'react';
import { BsStarFill } from 'react-icons/bs';
import mobilePhone from '../../../assets/mobilePhone.webp';
import './Cart.css';
import AddToCartButton from '../../Buttons/AddToCartButton.js'
import { MdDelete } from "react-icons/md";
import { FaMinus, FaPlus } from 'react-icons/fa';

export class Cart extends Component {
    static displayName = Cart.name;

    state = {
        quantity: 1
    }

    incrementQuantity = () => {
        this.setState(prevState => ({
            quantity: prevState.quantity + 1
        }));
    }

    decrementQuantity = () => {
        this.setState(prevState => ({
            quantity: Math.max(1, prevState.quantity - 1)
        }));
    }

    render() {
        return (
            <div className="container">
                <h2 className="cart-heading">Your Cart</h2>
                <div className="cart cart-main-grid">
                    <div className="cart-item__attributes cart-sub-grid">
                        <p className="column-header">Item</p>
                        <p></p>
                        <p className="column-header">Price</p>
                        <p className="column-header">Quantity</p>
                        <p className="column-header">Total</p>
                    </div>
                    <div className="cart-item cart-sub-grid">
                        <img src={mobilePhone} alt="featured item" className="card__img" />

                        <p className="item-name">Mobile Phone</p>

                        <p className="item-price">$1500</p>
                        <div className="quantity-control">
                            <button onClick={this.decrementQuantity} className="quantity-btn">
                                <FaMinus />
                            </button>
                            <span className="quantity-number">{this.state.quantity}</span>
                            <button onClick={this.incrementQuantity} className="quantity-btn">
                                <FaPlus />
                            </button>
                        </div>
                        <div className="item-total__container">
                            <p className="item-total">${(1500 * this.state.quantity).toFixed(2)}</p>
                            <MdDelete className="delete-icon" />
                        </div>
                    </div>
                    <div className="cart-item cart-sub-grid">
                        <img src={mobilePhone} alt="featured item" className="card__img" />

                        <p className="item-name">Mobile Phone</p>

                        <p className="item-price">$1500</p>
                        <div className="quantity-control">
                            <button onClick={this.decrementQuantity} className="quantity-btn">
                                <FaMinus />
                            </button>
                            <span className="quantity-number">{this.state.quantity}</span>
                            <button onClick={this.incrementQuantity} className="quantity-btn">
                                <FaPlus />
                            </button>
                        </div>
                        <div className="item-total__container">
                            <p className="item-total">${(1500 * this.state.quantity).toFixed(2)}</p>
                            <MdDelete className="delete-icon" />
                        </div>
                    </div>
                </div>

                <div className="cart-summary">
                    <div class="cart-summary__container">
                        <p class="cart-summary-heading">Subtotal:</p>
                        <p class="cart-total">AU $1,599.98</p>
                    </div>
                    <div class="cart-summary__container">
                        <p class="cart-summary-heading">GST 10% Tax Rate:</p>
                        <p class="cart-total">AU $145.45</p>
                    </div>
                    <a href="./" class="checkout-btn">Checkout</a>
                    
                </div>

            </div>
        );
    }
} 