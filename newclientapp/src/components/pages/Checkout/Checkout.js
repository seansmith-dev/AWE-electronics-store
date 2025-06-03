import React, { Component } from 'react';
import './Checkout.css';
import { useNavigate } from 'react-router-dom';

/* ─── helpers ─────────────────────────────────────── */
function getCookie(name) {
  let val = null;
  if (document.cookie && document.cookie !== '') {
    for (const c of document.cookie.split(';')) {
      const cookie = c.trim();
      if (cookie.startsWith(name + '=')) {
        val = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return val;
}

function CheckoutWrapper() {
  const navigate = useNavigate();
  return <Checkout navigate={navigate} />;
}

/* ─── component ───────────────────────────────────── */
export class Checkout extends Component {
  static displayName = Checkout.name;

  state = {
    cart: null,
    loading: true,
    error: null,
    subtotal: 0,
    gst: 0,
    total: 0,
    /* form fields */
    fullName: '',
    address: '',
    city: '',
    postalCode: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    email: '',
    isPlacingOrder: false
  };

  /* ── fetch cart ────────────────────────────────── */
  componentDidMount() {
    this.fetchCart();
  }

  fetchCart = async () => {
    this.setState({ loading: true, error: null });
    try {
      const res = await fetch('/api/carts/', { credentials: 'include' });
      const data = await res.json();
      const cart = data.length ? data[0] : null;
      this.setState({ cart, loading: false });
      this.calculateTotals(cart ? cart.items : []);
      document.dispatchEvent(new Event('cart-updated'));
    } catch (err) {
      console.error(err);
      this.setState({ error: err.message, loading: false });
    }
  };

  calculateTotals = items => {
    const sub = items.reduce(
      (s, it) => s + it.quantity * parseFloat(it.unit_price),
      0
    );
    const gst = sub * 0.1;
    this.setState({ subtotal: sub, gst, total: sub + gst });
  };

  /* ── general input handler ─────────────────────── */
  handleInputChange = e => {
    this.setState({ [e.target.id]: e.target.value });
  };

  /* ── place order ───────────────────────────────── */
  handlePlaceOrder = async e => {
    e.preventDefault();
    const { navigate } = this.props;
    const {
      cart,
      isPlacingOrder,
      fullName,
      address,
      city,
      postalCode,
      cardNumber,
      expiryDate,
      cvv,
      email
    } = this.state;

    if (isPlacingOrder) return;

    if (
      !fullName ||
      !address ||
      !city ||
      !postalCode ||
      !cardNumber ||
      !expiryDate ||
      !cvv ||
      (!cart?.customer && !email)
    ) {
      alert('Please fill in all required fields.');
      return;
    }
    if (!cart || !cart.items || !cart.items.length) {
      alert('Your cart is empty.');
      return;
    }

    this.setState({ isPlacingOrder: true });
    const csrftoken = getCookie('csrftoken');

    try {
      const orderRes = await fetch('/api/orders/place_order_from_cart/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_email: email,
          delivery_address: `${address}, ${city}, ${postalCode}`
        })
      });
      if (!orderRes.ok) throw new Error(JSON.stringify(await orderRes.json()));

      const order = await orderRes.json(); // { order_id, total_amount, … }
      document.dispatchEvent(new Event('cart-updated'));

      const payload = {
        orderId: order.order_id,
        totalAmount: order.total_amount,      // ← decimal string e.g. "1200.00"
        customerId: cart ? cart.customer : null
      };
      sessionStorage.setItem('confirmData', JSON.stringify(payload));
      navigate('/purchaseConfirmation', { state: payload });
    } catch (err) {
      console.error(err);
      alert(`Checkout failed: ${err.message}`);
    } finally {
      this.setState({ isPlacingOrder: false });
    }
  };

  /* ── render ────────────────────────────────────── */
  render() {
    const {
      loading,
      error,
      subtotal,
      gst,
      total,
      fullName,
      address,
      city,
      postalCode,
      cardNumber,
      expiryDate,
      cvv,
      email,
      isPlacingOrder
    } = this.state;

    if (loading)
      return (
        <div className="container mt-5">
          <h2 className="checkout-heading">Checkout</h2>
          <p>Loading order summary...</p>
        </div>
      );

    if (error)
      return (
        <div className="container mt-5">
          <h2 className="checkout-heading">Checkout</h2>
          <p style={{ color: 'red' }}>{error}</p>
        </div>
      );

    return (
      <div className="container">
        <h2 className="checkout-heading">Checkout</h2>
        <div className="checkout-container">
          {/* ─── Shipping section keeps original classes ─── */}
          <div className="checkout-section">
            <h3>Shipping Information</h3>
            <form className="checkout-form">
              <label>Full Name</label>
              <input
                id="fullName"
                className="form-control"
                value={fullName}
                onChange={this.handleInputChange}
              />
              <label>Email</label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                onChange={this.handleInputChange}
              />
              <label>Address</label>
              <input
                id="address"
                className="form-control"
                value={address}
                onChange={this.handleInputChange}
              />
              <label>City</label>
              <input
                id="city"
                className="form-control"
                value={city}
                onChange={this.handleInputChange}
              />
              <label>Postal Code</label>
              <input
                id="postalCode"
                className="form-control"
                value={postalCode}
                onChange={this.handleInputChange}
              />
            </form>
          </div>

          {/* ─── Payment + Summary section keeps original classes ─── */}
          <div className="checkout-section">
            <h3>Payment Information</h3>
            <form className="checkout-form">
              <label>Card Number</label>
              <input
                id="cardNumber"
                className="form-control"
                value={cardNumber}
                onChange={this.handleInputChange}
              />
              <div className="payment-row">
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    id="expiryDate"
                    className="form-control"
                    value={expiryDate}
                    onChange={this.handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>CVV</label>
                  <input
                    id="cvv"
                    className="form-control"
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
                <span>AUD ${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>GST (10%):</span>
                <span>AUD ${gst.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>AUD ${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              className="place-order-btn"
              disabled={isPlacingOrder || total <= 0}
              onClick={this.handlePlaceOrder}
            >
              {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default CheckoutWrapper;
