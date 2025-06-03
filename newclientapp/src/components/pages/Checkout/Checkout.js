import React, { Component } from 'react';
import './Checkout.css';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate for redirection

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

// Functional component wrapper to use useNavigate hook
function CheckoutWrapper() {
    const navigate = useNavigate();
    return <Checkout navigate={navigate} />;
}

export class Checkout extends Component {
    static displayName = Checkout.name;

    constructor(props) {
        super(props);
        this.state = {
            cart: null,
            loading: true,
            error: null,
            subtotal: 0,
            gst: 0,
            total: 0,
            // Form fields for shipping and payment
            fullName: '',
            address: '',
            city: '',
            postalCode: '',
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            isPlacingOrder: false, // To prevent double clicks
        };
    }

    componentDidMount() {
        this.fetchCart(); // Fetch cart data to populate order summary
    }

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
            const userCart = data.length > 0 ? data[0] : null;

            if (userCart) {
                this.setState({ cart: userCart, loading: false });
                this.calculateTotals(userCart.items || []);
            } else {
                this.setState({ cart: null, loading: false });
                this.calculateTotals([]);
            }

        } catch (error) {
            console.error("Failed to fetch cart for checkout:", error);
            this.setState({ error: error.message, loading: false });
        }
    };

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
     * Handles form input changes.
     */
    handleInputChange = (event) => {
        const { id, value } = event.target;
        this.setState({ [id]: value });
    };

    /**
     * Handles placing the order.
     */
    handlePlaceOrder = async (event) => {
        event.preventDefault(); // Prevent default form submission
        const { navigate, cart, isPlacingOrder } = this.props; // Access navigate from props
        const { fullName, address, city, postalCode, cardNumber, expiryDate, cvv } = this.state;

        if (isPlacingOrder) return; // Prevent multiple submissions

        // Basic form validation (add more robust validation as needed)
        if (!fullName || !address || !city || !postalCode || !cardNumber || !expiryDate || !cvv) {
            alert('Please fill in all shipping and payment information.'); // Replace with custom UI
            return;
        }
        if (!cart || !cart.items || cart.items.length === 0) {
            alert('Your cart is empty. Please add items before placing an order.');
            return;
        }

        this.setState({ isPlacingOrder: true });
        const csrftoken = getCookie('csrftoken'); // Get the CSRF token

        try {
            // Step 1: Place the order from the cart
            const orderResponse = await fetch('/api/orders/place_order_from_cart/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken, // Include the CSRF token header
                },
                // Add credentials: 'include'
                credentials: 'include',
                body: JSON.stringify({
                    // You can optionally send delivery_address if it's different from user's default
                    // delivery_address: `${address}, ${city}, ${postalCode}`
                }),
            });

            if (!orderResponse.ok) {
                const errorData = await orderResponse.json();
                throw new Error(`Failed to place order: ${JSON.stringify(errorData)}`);
            }

            const orderData = await orderResponse.json();
            console.log('Order placed:', orderData);

            // Pass the order ID and customer ID to the PurchaseConfirmed page
            // Assuming the authenticated user's ID is available in the cart object or a global state
            const customerId = cart.customer; // Get customer ID from the fetched cart
            navigate('/purchaseConfirmation', { state: { orderId: orderData.id, totalAmount: orderData.total_amount, customerId: customerId } });

        } catch (error) {
            console.error("Error during checkout:", error);
            alert(`Checkout failed: ${error.message}`); // Replace with custom UI
        } finally {
            this.setState({ isPlacingOrder: false });
        }
    };

    render() {
        const { loading, error, subtotal, gst, total, fullName, address, city, postalCode, cardNumber, expiryDate, cvv, isPlacingOrder } = this.state;

        if (loading) {
            return (
                <div className="container mt-5">
                    <h2 className="checkout-heading">Checkout</h2>
                    <p>Loading order summary...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="container mt-5">
                    <h2 className="checkout-heading">Checkout</h2>
                    <p style={{ color: 'red' }}>Error loading checkout data: {error}</p>
                </div>
            );
        }

        return (
            <div className="container">
                <h2 className="checkout-heading">Checkout</h2>
                <div className="checkout-container">
                    <div className="checkout-section">
                        <h3>Shipping Information</h3>
                        <form className="checkout-form">
                            <div className="form-group">
                                <label htmlFor="fullName">Full Name</label>
                                <input type="text" id="fullName" className="form-control" value={fullName} onChange={this.handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="address">Address</label>
                                <input type="text" id="address" className="form-control" value={address} onChange={this.handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="city">City</label>
                                <input type="text" id="city" className="form-control" value={city} onChange={this.handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="postalCode">Postal Code</label>
                                <input type="text" id="postalCode" className="form-control" value={postalCode} onChange={this.handleInputChange} />
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
                                    value={cardNumber}
                                    onChange={this.handleInputChange}
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
                                        value={expiryDate}
                                        onChange={this.handleInputChange}
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
                                        value={cvv}
                                        onChange={this.handleInputChange}
                                    />
                                </div>
                            </div>
                        </form>

                        <h3 className="order-summary-heading">Order Summary</h3>
                        <div className="order-summary">
                            <div className="summary-row">
                                <span>Subtotal:</span>
                                {/* Convert subtotal to float before calling toFixed */}
                                <span>AU ${parseFloat(subtotal).toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span>GST (10%):</span>
                                {/* Convert gst to float before calling toFixed */}
                                <span>AU ${parseFloat(gst).toFixed(2)}</span>
                            </div>
                            <div className="summary-row total">
                                <span>Total:</span>
                                {/* Convert total to float before calling toFixed */}
                                <span>AU ${parseFloat(total).toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <button
                            onClick={this.handlePlaceOrder}
                            className="place-order-btn"
                            disabled={isPlacingOrder || total <= 0} // Disable if order is being placed or total is zero
                        >
                            {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default CheckoutWrapper; // Export the wrapper component
