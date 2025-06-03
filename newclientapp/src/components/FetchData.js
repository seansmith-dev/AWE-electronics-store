import React, { Component } from 'react';

export class FetchData extends Component {
  static displayName = FetchData.name;

  constructor(props) {
    super(props);
    // Initialize state to hold items, loading status, and any error
    this.state = { items: [], loading: true, error: null };
  }

  componentDidMount() {
    // Call the method to fetch items when the component mounts
    this.populateItemsData();
  }

  /**
   * Renders a table of items.
   * @param {Array} items - The list of item objects to display.
   */
  static renderItemsTable(items) {
    return (
      <table className='table table-striped' aria-labelledby="tableLabel">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Price</th>
            <th>Quantity Available</th>
            <th>Available</th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>
          {/* Map through the items array and create a table row for each item */}
          {items.map(item =>
            <tr key={item.item_id}>
              <td>{item.item_id}</td>
              <td>{item.item_name}</td>
              <td>${parseFloat(item.unit_price).toFixed(2)}</td> {/* Format price to 2 decimal places */}
              <td>{item.quantity_available}</td>
              <td>{item.is_available ? 'Yes' : 'No'}</td>
              <td>
                {/* Display item image if available, with a fallback placeholder */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.item_name}
                    style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/50x50/cccccc/ffffff?text=No+Image'; }}
                  />
                ) : (
                  <img
                    src='https://placehold.co/50x50/cccccc/ffffff?text=No+Image'
                    alt="No Image"
                    style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  render() {
    const { items, loading, error } = this.state;

    let contents;
    if (loading) {
      contents = <p><em>Loading items...</em></p>;
    } else if (error) {
      contents = <p style={{ color: 'red' }}>Error: {error}</p>;
    } else {
      contents = FetchData.renderItemsTable(items);
    }

    return (
      <div className="container mt-5">
        <h1 id="tableLabel" className="text-3xl font-bold mb-4">Product Catalogue</h1>
        <p className="mb-4">This component demonstrates fetching product data from the Django backend.</p>
        {contents}
      </div>
    );
  }

  /**
   * Asynchronously fetches item data from the Django API.
   */
  async populateItemsData() {
    try {
      // Use the relative path; the proxy will redirect to http://127.0.0.1:8000/api/items/
      const response = await fetch('/api/items/');
      if (!response.ok) {
        // If the response is not OK (e.g., 404, 500), throw an error
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      const data = await response.json();
      this.setState({ items: data, loading: false });
    } catch (error) {
      console.error("Failed to fetch items:", error);
      this.setState({ error: error.message, loading: false });
    }
  }
}
