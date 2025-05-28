# 🛒 AWE Electronics Store – Backend API Quick Start

Welcome to the backend API for the AWE Electronics Store.

This guide walks you through logging in, fetching items, and managing your shopping cart using your browser and Postman.

---

## 1. Log In as a Test Customer

Open your browser and go to:

- [http://127.0.0.1:8000/api/](http://127.0.0.1:8000/api/)
- or [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

Log in with:

- **Username:** `test_customer`
- **Password:** `customerpass`

---

## 2. Get CSRF Token (if using Session Authentication)

If you’re using session-based authentication, you’ll need a CSRF token:

- In your browser (e.g., Chrome):  
  Open Dev Tools → Application → Cookies for `http://127.0.0.1:8000/`.
- Find the `csrftoken` cookie and copy its value.
- In Postman, add a header:  
  `X-CSRFToken: <your_token_here>`

---

## 3. Fetch Available Items

Before adding to your cart, get the list of items:

- **Method:** `GET`
- **URL:** `http://127.0.0.1:8000/api/items/`

You’ll get a JSON list of all items. Find the `id` for the item you want (e.g., Dell XPS 15 or iPhone 15 Pro).

---

## 4. Add an Item to Your Cart

The `CartItemViewSet` handles adding/updating cart items. If you add an item already in your cart, its quantity is updated; otherwise, a new cart item is created.

- **Method:** `POST`
- **URL:** `http://127.0.0.1:8000/api/cartitems/`
- **Authentication:** Required (use your `test_customer` credentials)
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Token <your_customer_token>` (if using Token Auth)
  - or `X-CSRFToken: <your_token_here>` (if using Session Auth)
- **Body (raw JSON):**
  ```json
  {
    "item": 1,        // Replace 1 with the actual item_id from step 3
    "quantity": 1     // Or any quantity within available stock
  }
  ```

### Expected Responses

- **201 Created:**  
  Item added to the cart for the first time.
- **200 OK:**  
  Item already in the cart, quantity updated.
- **400 Bad Request:**  
  - Missing fields  
  - Not enough stock  
  - Invalid `item_id`
- **401 Unauthorized:**  
  Missing or invalid authentication.
- **403 Forbidden:**  
  User lacks permissions (unlikely for `test_customer`).

---

## 5. View Your Shopping Cart

After adding items, check your cart contents:

- **Method:** `GET`
- **URL:** `http://127.0.0.1:8000/api/carts/`
- **Authentication:** Required (same as above)
- **Headers:** Same as above

You should see a list of shopping carts. Each user has one cart, so you’ll likely see just one entry for `test_customer`, with a nested `items` array showing your cart items, quantities, and item details.

---

## Notes

- Make sure you have run the data population script to load items before testing.
- The API supports both Token and Session authentication.
- For development/testing only. Do not use these credentials in production.

---
