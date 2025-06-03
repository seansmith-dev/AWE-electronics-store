import React, { Component } from 'react';
// The following imports are no longer needed as data will come from the API
// import { BsStarFill } from 'react-icons/bs';
// import mobilePhone from '../../../assets/mobilePhone.webp';
// import AddToCartButton from '../../Buttons/AddToCartButton.js' 
import './Cart.css';
import { MdDelete } from "react-icons/md";
import { FaMinus, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';

/**
 * Helper function to get a cookie by name.
 * This is crucial for retrieving the CSRF token.
 * @param {string} name - The name of the cookie to retrieve (e.g., 'csrftoken').
 * @returns {string|null} The value of the cookie, or null if not found.
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

export class Cart extends Component {
    static displayName = Cart.name;

    constructor(props) {
        super(props);
        this.state = {
            cart: null, // Will store the fetched cart object
            loading: true,
            error: null,
            subtotal: 0,
            gst: 0,
            total: 0,
        };
    }

    componentDidMount() {
        this.fetchCart(); // Fetch cart data when component mounts
    }

    /**
     * Calculates subtotal, GST, and total based on cart items.
     * @param {Array} cartItems - Array of cart item objects.
     */
    calculateTotals = (cartItems) => {
        let sub = 0;
        cartItems.forEach(item => {
            // Ensure unit_price is parsed as float
            sub += item.quantity * parseFloat(item.unit_price);
        });
        const gstRate = 0.10; // 10% GST
        const gstAmount = sub * gstRate;
        const totalAmount = sub + gstAmount;

        this.setState({
            subtotal: sub,
            gst: gstAmount,
            total: totalAmount,
        });
    };

    /**
     * Fetches the authenticated user's shopping cart.
     */
    fetchCart = async () => {
        this.setState({ loading: true, error: null });
        try {
            // Add credentials: 'include' to send cookies (for session authentication)
            const response = await fetch('/api/carts/', { credentials: 'include' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`);
            }
            const data = await response.json();
            // Assuming the first cart in the list belongs to the current user
            const userCart = data.length > 0 ? data[0] : null;

            if (userCart) {
                this.setState({ cart: userCart, loading: false });
                this.calculateTotals(userCart.items || []); // Calculate totals based on fetched items
            } else {
                this.setState({ cart: null, loading: false });
                this.calculateTotals([]); // No cart, so totals are zero
            }
            document.dispatchEvent(new Event('cart-updated'));

        } catch (error) {
            console.error("Failed to fetch cart:", error);
            this.setState({ error: error.message, loading: false });
        }
    };

    /**
     * Updates the quantity of a specific item in the cart.
     * @param {number} cartItemId - The ID of the CartItem to update.
     * @param {number} newQuantity - The new quantity for the item.
     */
    updateCartItemQuantity = async (cartItemId, newQuantity) => {
        const csrftoken = getCookie('csrftoken'); // Get the CSRF token

        try {
            const response = await fetch(`/api/cart-items/${cartItemId}/`, {
                method: 'PATCH', // Use PATCH for partial updates
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken, // Include the CSRF token header
                },
                credentials: 'include', // Send cookies
                body: JSON.stringify({ quantity: newQuantity }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            // After successful update, re-fetch the cart to get the latest state and recalculate totals
            this.fetchCart();
        } catch (error) {
            console.error("Error updating cart item quantity:", error);
            alert(`Error updating quantity: ${error.message}`); // Using alert for simplicity
        }
    };

    /**
     * Deletes a specific item from the cart.
     * @param {number} cartItemId - The ID of the CartItem to delete.
     */
    deleteCartItem = async (cartItemId) => {
        if (!window.confirm("Are you sure you want to remove this item from your cart?")) { // Using window.confirm, consider custom modal
            return;
        }
        const csrftoken = getCookie('csrftoken'); // Get the CSRF token

        try {
            const response = await fetch(`/api/cart-items/${cartItemId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrftoken, // Include the CSRF token header
                },
                credentials: 'include', // Send cookies
            });

            if (!response.ok) {
                // For DELETE, 204 No Content is common for success, so check for !response.ok
                const errorText = await response.text(); // Get raw text for non-JSON errors
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            // After successful deletion, re-fetch the cart
            this.fetchCart();
        } catch (error) {
            console.error("Error deleting cart item:", error);
            alert(`Error deleting item: ${error.message}`); // Using alert for simplicity
        }
    };

    render() {
        const { cart, loading, error, subtotal, gst, total } = this.state;

        if (loading) {
            return (
                <div className="container mt-5">
                    <h2 className="cart-heading">Your Cart</h2>
                    <p>Loading cart...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="container mt-5">
                    <h2 className="cart-heading">Your Cart</h2>
                    <p style={{ color: 'red' }}>Error loading cart: {error}</p>
                </div>
            );
        }

        const cartItems = cart && cart.items ? cart.items : [];
        const checkoutDisabled = cartItems.length === 0;

        return (
            <div className="container">
                <h2 className="cart-heading">Your Cart</h2>
                <div className="cart cart-main-grid">
                    <div className="cart-item__attributes cart-sub-grid">
                        <p className="column-header">Item</p>
                        <p></p> {/* Empty column for image */}
                        <p className="column-header">Price</p>
                        <p className="column-header">Quantity</p>
                        <p className="column-header">Total</p>
                    </div>

                    {cartItems.length === 0 ? (
                        <p className="text-center py-4">Your cart is empty.</p>
                    ) : (
                        cartItems.map(cartItem => (
                            <div className="cart-item cart-sub-grid" key={cartItem.id}>
                                <img
                                    src={cartItem.item.image_url || 'https://placehold.co/100x100/cccccc/ffffff?text=No+Image'}
                                    alt={cartItem.item.item_name}
                                    className="card__img"
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100/cccccc/ffffff?text=No+Image'; }}
                                />
                                <p className="item-name">{cartItem.item.item_name}</p>
                                {/* Convert unit_price to float before calling toFixed */}
                                <p className="item-price">${parseFloat(cartItem.unit_price).toFixed(2)}</p>
                                <div className="quantity-control">
                                    <button
                                        onClick={() => this.updateCartItemQuantity(cartItem.id, cartItem.quantity - 1)}
                                        className="quantity-btn"
                                        disabled={cartItem.quantity <= 1} // Disable if quantity is 1
                                    >
                                        <FaMinus />
                                    </button>
                                    <span className="quantity-number">{cartItem.quantity}</span>
                                    <button
                                        onClick={() => this.updateCartItemQuantity(cartItem.id, cartItem.quantity + 1)}
                                        className="quantity-btn"
                                    >
                                        <FaPlus />
                                    </button>
                                </div>
                                <div className="item-total__container">
                                    {/* Convert unit_price to float before calling toFixed */}
                                    <p className="item-total">${(parseFloat(cartItem.unit_price) * cartItem.quantity).toFixed(2)}</p>
                                    <MdDelete
                                        className="delete-icon"
                                        onClick={() => this.deleteCartItem(cartItem.id)}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="cart-summary">
                    <div className="cart-summary__container">
                        <p className="cart-summary-heading">Subtotal:</p>
                        {/* Convert subtotal to float before calling toFixed */}
                        <p className="cart-total">AU ${parseFloat(subtotal).toFixed(2)}</p>
                    </div>
                    <div className="cart-summary__container">
                        <p className="cart-summary-heading">GST 10% Tax Rate:</p>
                        {/* Convert gst to float before calling toFixed */}
                        <p className="cart-total">AU ${parseFloat(gst).toFixed(2)}</p>
                    </div>
                    <div className="cart-summary__container font-bold text-xl">
                        <p className="cart-summary-heading">Total:</p>
                        {/* Convert total to float before calling toFixed */}
                        <p className="cart-total">AU ${parseFloat(total).toFixed(2)}</p>
                    </div>
                    {checkoutDisabled ? (
                        <button className="checkout-btn disabled" disabled>
                            Checkout
                        </button>
                    ) : (
                        <Link to="/checkout" className="checkout-btn">
                            Checkout
                        </Link>
                    )}
                </div>
            </div>
        );
    }
}
