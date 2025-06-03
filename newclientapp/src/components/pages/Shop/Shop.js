// src/components/pages/Shop/Shop.js
import React, { Component } from 'react';
import { BsStarFill } from 'react-icons/bs';
import './Shop.css';
import AddToCartButton from '../../Buttons/AddToCartButton.js';

/* ─── helper – read csrftoken cookie ────────────────────────────────────── */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const cookie = c.trim();
      if (cookie.substring(0, name.length + 1) === `${name}=`) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export default class Shop extends Component {
  static displayName = Shop.name;

  state = {
    products: [],
    loading: true,
    error: null,
    csrfTokenReady: false,
  };

  componentDidMount() {
    this.fetchProductsAndCsrfToken();
  }

  /* ─── 1. initialise CSRF cookie then get products ────────────────────── */
  fetchProductsAndCsrfToken = async () => {
    try {
      /* Step 1 – hit Django login page so csrftoken cookie is set */
      const csrfRes = await fetch('/api-auth/login/', { credentials: 'include' });
      if (!csrfRes.ok) throw new Error(`CSRF init failed (${csrfRes.status})`);

      /* Step 2 – fetch the full product list */
      const prodRes = await fetch('/api/items/', { credentials: 'include' });
      if (!prodRes.ok) {
        const err = await prodRes.json();
        throw new Error(`GET /api/items/ → ${prodRes.status}: ${JSON.stringify(err)}`);
      }
      const data = await prodRes.json();
      this.setState({ products: data, loading: false, csrfTokenReady: true });
    } catch (err) {
      console.error(err);
      this.setState({ error: err.message, loading: false, csrfTokenReady: false });
    }
  };

  /* ─── 2. Add-to-cart handler (fires cart-updated event) ──────────────── */
  handleAddToCart = async (itemId, quantity = 1) => {
    if (!this.state.csrfTokenReady) {
      alert('Page still initialising. Please wait a moment and try again.');
      return;
    }

    const csrftoken = getCookie('csrftoken');
    if (!csrftoken) {
      alert('CSRF token not found. Refresh the page and ensure cookies are enabled.');
      return;
    }

    try {
      const res = await fetch('/api/cart-items/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        credentials: 'include',
        body: JSON.stringify({ item: itemId, quantity }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `POST failed (${res.status})`);
      }

      const data = await res.json();
      alert(`"${data.item_name}" added to cart! Quantity: ${data.quantity}`);
      document.dispatchEvent(new Event('cart-updated'));  // refresh nav badge
    } catch (err) {
      console.error(err);
      alert(`Add-to-cart failed: ${err.message}`);
    }
  };

  /* ─── 3. render ──────────────────────────────────────────────────────── */
  render() {
    const { products, loading, error, csrfTokenReady } = this.state;

    if (loading || !csrfTokenReady) {
      return (
        <div className="hero-container">
          <h1>All Products</h1>
          <p>Loading catalogue…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="hero-container">
          <h1>All Products</h1>
          <p style={{ color: 'red' }}>Error: {error}</p>
        </div>
      );
    }

    return (
      <div>
        <div className="hero-container background-image--none">
          <h1>All Products</h1>
        </div>

        <section className="featured-products container grid-template">
          {products.map(p => (
            <div className="card-item" key={p.item_id}>
              <img
                src={p.image_url || 'https://placehold.co/200x200/cccccc/ffffff?text=No+Image'}
                alt={p.item_name}
                className="card__img"
                onError={e => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://placehold.co/200x200/cccccc/ffffff?text=No+Image';
                }}
              />

              <h3 className="card__item-title">{p.item_name}</h3>

              <div className="card__item-rating">
                {[...Array(5)].map((_, i) => (
                  <BsStarFill key={i} />
                ))}
              </div>

              <p className="card__item-price">${parseFloat(p.unit_price).toFixed(2)}</p>

              <AddToCartButton
                className="btn--centering"
                buttonSize="medium-small"
                buttonWidth="super-slim"
                buttonText="Add to Cart"
                onClick={() => this.handleAddToCart(p.item_id)}
              />
            </div>
          ))}
        </section>
      </div>
    );
  }
}
