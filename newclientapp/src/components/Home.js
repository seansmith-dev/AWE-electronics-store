import React, { Component } from 'react';
import { BsStarFill } from 'react-icons/bs';
// import mobilePhone from '../assets/mobilePhone.webp'; // No longer needed, will use image_url from API
import './Home.css';
import AddToCartButton from './Buttons/AddToCartButton.js';

export class Home extends Component {
  static displayName = Home.name;

  constructor(props) {
    super(props);
    this.state = {
      products: [], // State to store fetched products
      loading: true, // Loading indicator
      error: null,   // Error message
    };
  }

  componentDidMount() {
    this.fetchProducts(); // Fetch products when the component mounts
  }

  /**
   * Fetches product data from the Django API.
   * You can adjust the API call here if you want to fetch only a subset
   * of items or specific "featured" items (e.g., /api/items/highest_selling/).
   */
  async fetchProducts() {
    try {
      const response = await fetch('/api/items/'); // Fetch from your Django API
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      const data = await response.json();
      this.setState({ products: data, loading: false });
    } catch (error) {
      console.error("Failed to fetch products for Home page:", error);
      this.setState({ error: error.message, loading: false });
    }
  }

  /**
   * Handles adding an item to the shopping cart.
   * This function is similar to the one in Shop.js.
   * @param {number} itemId - The ID of the item to add.
   * @param {number} quantity - The quantity to add (defaulting to 1).
   */
  handleAddToCart = async (itemId, quantity = 1) => {
    try {
      const response = await fetch('/api/cart-items/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // IMPORTANT: For authenticated endpoints, you need to send credentials.
          // If using Session Authentication (common in dev), browser handles cookies.
          // If using Token Authentication, you'd add: 'Authorization': `Token YOUR_AUTH_TOKEN`
          // For now, assuming session cookies are handled by the browser/proxy.
        },
        body: JSON.stringify({
          item: itemId,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.detail) {
            throw new Error(`Failed to add to cart: ${errorData.detail}`);
        }
        throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('Item added to cart from Home:', data);
      alert(`"${data.item_name}" added to cart! Quantity: ${data.quantity}`); // Using alert for simplicity, replace with custom UI
    } catch (error) {
      console.error("Error adding to cart from Home:", error);
      alert(`Error adding to cart: ${error.message}`); // Using alert for simplicity
    }
  };

  render() {
    const { products, loading, error } = this.state;

    if (loading) {
      return (
        <div className="hero-container">
          <h1>AWE Electronics</h1>
          <p>Loading featured products...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="hero-container">
          <h1>AWE Electronics</h1>
          <p style={{ color: 'red' }}>Error loading products: {error}</p>
        </div>
      );
    }

    return (
      <div>
        <div className="hero-container">
          <h1>AWE Electronics</h1>
        </div>
        <section className="featured-products container grid-template">
          {products.map(product => (
            <div className="card-item" key={product.item_id}>
              {/* Use product.image_url from the API, with a fallback */}
              <img
                src={product.image_url || 'https://placehold.co/200x200/cccccc/ffffff?text=No+Image'}
                alt={product.item_name}
                className="card__img"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/200x200/cccccc/ffffff?text=No+Image'; }}
              />
              <h3 className="card__item-title">{product.item_name}</h3>
              <div className="card__item-rating">
                {/* Static stars for now, as rating is not in your model */}
                <BsStarFill />
                <BsStarFill />
                <BsStarFill />
                <BsStarFill />
                <BsStarFill />
              </div>
              {/* Convert unit_price to float before calling toFixed */}
              <p className="card__item-price">${parseFloat(product.unit_price).toFixed(2)}</p>
              <AddToCartButton
                className="btn--centering"
                buttonSize="medium-small"
                buttonWidth="super-slim"
                buttonText="Add to Cart"
                onClick={() => this.handleAddToCart(product.item_id)} // Pass item ID to handler
              />
            </div>
          ))}
        </section>
      </div>
    );
  }
}
