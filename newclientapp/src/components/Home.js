import React, { Component } from 'react';
import { BsStarFill } from 'react-icons/bs';
import './Home.css';
import AddToCartButton from './Buttons/AddToCartButton.js';

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

export class Home extends Component {
    static displayName = Home.name;

    constructor(props) {
        super(props);
        this.state = {
            products: [], // State to store fetched products
            loading: true, // Loading indicator
            error: null,  // Error message
            csrfTokenReady: false, // New state to track if CSRF token is available
        };
    }

    componentDidMount() {
        this.fetchProductsAndCsrfToken(); // Fetch products and ensure CSRF token is ready
    }

    /**
     * Fetches product data from the Django API and ensures the csrftoken cookie is set.
     */
    async fetchProductsAndCsrfToken() {
        try {
            // First, make a GET request to a Django endpoint to ensure csrftoken cookie is set.
            // The /api/items/ endpoint is a good candidate as it's publicly accessible.
            const response = await fetch('/api/items/', { credentials: 'include' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`);
            }
            const data = await response.json();
            this.setState({ products: data, loading: false, csrfTokenReady: true });
            console.log('Products fetched and CSRF token should be set.');
        } catch (error) {
            console.error("Failed to fetch products or CSRF token for Home page:", error);
            this.setState({ error: error.message, loading: false, csrfTokenReady: false });
        }
    }

    /**
     * Handles adding an item to the shopping cart.
     * This function now ensures the CSRF token is ready before proceeding.
     * @param {number} itemId - The ID of the item to add.
     * @param {number} quantity - The quantity to add (defaulting to 1).
     */
    handleAddToCart = async (itemId, quantity = 1) => {
        // Ensure CSRF token is ready before attempting to add to cart
        if (!this.state.csrfTokenReady) {
            alert('The page is still initializing. Please wait a moment and try again. If the issue persists, refresh the page.');
            // Optionally, re-attempt fetching the token
            this.fetchProductsAndCsrfToken();
            return;
        }

        const csrftoken = getCookie('csrftoken'); // Get the CSRF token

        if (!csrftoken) {
            alert('CSRF token not found. Please ensure cookies are enabled and refresh the page. If the issue persists, there might be a backend configuration problem.');
            return;
        }

        try {
            const response = await fetch('/api/cart-items/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken, // Include the CSRF token for POST requests
                },
                credentials: 'include', // Send session cookies (including sessionid and csrftoken)
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
            // Replace alert with a more user-friendly notification system in a real app
            alert(`"${data.item_name}" added to cart! Quantity: ${data.quantity}`);
        } catch (error) {
            console.error("Error adding to cart from Home:", error);
            // Replace alert with a more user-friendly notification system in a real app
            alert(`Error adding to cart: ${error.message}`);
        }
    };

    render() {
        const { products, loading, error, csrfTokenReady } = this.state;

        if (loading || !csrfTokenReady) { // Show loading until products and CSRF token are ready
            return (
                <div className="hero-container">
                    <h1>AWE Electronics</h1>
                    <p>Loading products and preparing cart functionality...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="hero-container">
                    <h1>AWE Electronics</h1>
                    <p style={{ color: 'red' }}>Error loading products: {error}</p>
                    <p>Please ensure your backend is running and you have populated the database.</p>
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
