import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import { IoMdDownload } from 'react-icons/io';

/* Re-use the same helper you use elsewhere for CSRF */
function getCookie(name) {
  let value = null;
  if (document.cookie && document.cookie !== '') {
    document.cookie.split(';').forEach(c => {
      const cookie = c.trim();
      if (cookie.startsWith(name + '=')) {
        value = decodeURIComponent(cookie.substring(name.length + 1));
      }
    });
  }
  return value;
}

export default function Dashboard() {
  const [user, setUser]     = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  /* ────────────────── fetch user + orders on mount ────────────────── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        /* 1. current user */
        const uRes = await fetch('/api/users/current_user/', { credentials: 'include' });
        if (!uRes.ok) throw new Error('Not logged in.');
        const uData = await uRes.json();
        setUser(uData);

        /* 2. their orders */
        const oRes = await fetch('/api/orders/', { credentials: 'include' });
        if (oRes.ok) {
          const oData = await oRes.json();
          setOrders(oData);
        } else {
          console.warn('Orders fetch failed:', oRes.status);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* ────────────────── helpers ────────────────── */
  const handleDownload = async (orderId, kind /* 'receipt' | 'invoice' */) => {
    const base = kind === 'invoice' ? '/api/invoices/' : '/api/receipts/';
    const csrftoken = getCookie('csrftoken');

    try {
      /* first request returns a list (0-or-1 for this order) */
      const listRes = await fetch(`${base}?order=${orderId}`, { credentials: 'include' });
      if (!listRes.ok) throw new Error('Lookup failed');
      const [file] = await listRes.json();
      if (!file) {
        alert(`No ${kind} available yet.`);
        return;
      }

      /* second request returns the signed URL */
      const dlRes = await fetch(`${base}${file.id}/download/`, {
        credentials: 'include',
        headers: { 'X-CSRFToken': csrftoken }
      });
      if (!dlRes.ok) throw new Error('Download failed');
      const { url } = await dlRes.json();
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert(`${kind.charAt(0).toUpperCase() + kind.slice(1)} download error.`);
    }
  };

  /* ────────────────── render ────────────────── */
  if (loading)  return <p className="dashboard-container">Loading dashboard…</p>;
  if (error)    return <p className="dashboard-container error">{error}</p>;

  return (
    <div className="dashboard-container">
      <h2>Welcome to Your Dashboard{user && `, ${user.username}`}</h2>

      {user && (
        <section>
          <h3>Your Info</h3>
          <p>Name: {user.first_name} {user.last_name}</p>
          <p>Email: {user.email}</p>
        </section>
      )}

      <section>
        <h3>Your Orders</h3>
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <ul>
            {orders.map(o => (
              <li key={o.order_id}>
                Order #{o.order_id} – AU ${parseFloat(o.total_amount).toFixed(2)} – {o.status}
                &nbsp;
                <button
                  title="Download receipt"
                  onClick={() => handleDownload(o.order_id, 'receipt')}
                >
                  <IoMdDownload /> Receipt
                </button>
                <button
                  title="Download invoice"
                  onClick={() => handleDownload(o.order_id, 'invoice')}
                >
                  <IoMdDownload /> Invoice
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
