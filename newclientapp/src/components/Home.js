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
     * Fetches the CSRF token from /api-auth/login/ and then fetches product data.
     * This leverages the known working mechanism for CSRF cookie setting.
     */
    async fetchProductsAndCsrfToken() {
        try {
            // First, make a GET request to the DRF login endpoint to ensure csrftoken cookie is set.
            // This endpoint is known to reliably set the CSRF cookie.
            const csrfResponse = await fetch('/api-auth/login/'); // Proxy handles redirection to backend
            if (!csrfResponse.ok) {
                const errorData = await csrfResponse.json();
                throw new Error(`Failed to initialize CSRF token: HTTP error! status: ${csrfResponse.status} - ${JSON.stringify(errorData)}`);
            }
            console.log('CSRF token fetch attempt from /api-auth/login/ completed.');

            // Now, fetch the products
            const productsResponse = await fetch('/api/items/featured/'); // Proxy handles redirection to backend

            if (!productsResponse.ok) {
                const errorData = await productsResponse.json();
                throw new Error(`HTTP error! status: ${productsResponse.status} - ${JSON.stringify(errorData)}`);
            }
            const data = await productsResponse.json();
            this.setState({ products: data, loading: false, csrfTokenReady: true });
            console.log('Products fetched.');
            console.log('Cookies visible to JavaScript (document.cookie):', document.cookie); // Final check for cookies
        } catch (error) {
            console.error("Initialization error (products or CSRF token):", error);
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
            this.fetchProductsAndCsrfToken(); // Try fetching again
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
            alert(`"${data.item_name}" added to cart! Quantity: ${data.quantity}`);
            document.dispatchEvent(new Event('cart-updated'));
        } catch (error) {
            console.error("Error adding to cart from Home:", error);
            alert(`Error adding to cart: ${error.message}`);
        }
    };

    render() {
        const { products, loading, error, csrfTokenReady } = this.state;

        if (loading || !csrfTokenReady) {
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
                            <img
                                src={product.image_url || 'https://placehold.co/200x200/cccccc/ffffff?text=No+Image'}
                                alt={product.item_name}
                                className="card__img"
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/200x200/cccccc/ffffff?text=No+Image'; }}
                            />
                            <h3 className="card__item-title">{product.item_name}</h3>
                            <div className="card__item-rating">
                                <BsStarFill />
                                <BsStarFill />
                                <BsStarFill />
                                <BsStarFill />
                                <BsStarFill />
                            </div>
                            <p className="card__item-price">${parseFloat(product.unit_price).toFixed(2)}</p>
                            <AddToCartButton
                                className="btn--centering"
                                buttonSize="medium-small"
                                buttonWidth="super-slim"
                                buttonText="Add to Cart"
                                onClick={() => this.handleAddToCart(product.item_id)}
                            />
                        </div>
                    ))}
                </section>
            </div>
        );
    }
}
