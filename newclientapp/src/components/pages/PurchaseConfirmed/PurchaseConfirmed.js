import React, { Component } from 'react';
import './PurchaseConfirmed.css';
import { FaCheckCircle } from 'react-icons/fa';
import { IoMdDownload } from 'react-icons/io';
import { useLocation } from 'react-router-dom';

/* ─── helper ───────────────────────────────────────── */
function getCookie(name) {
  let v = null;
  if (document.cookie && document.cookie !== '') {
    for (const c of document.cookie.split(';')) {
      const cookie = c.trim();
      if (cookie.startsWith(name + '=')) {
        v = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return v;
}

function Wrapper() {
  const location = useLocation();
  return <PurchaseConfirmed location={location} />;
}

/* ─── component ────────────────────────────────────── */
export class PurchaseConfirmed extends Component {
  static displayName = PurchaseConfirmed.name;

  state = {
    orderId: null,
    customerId: null,
    totalAmount: '0.00',
    paymentStatus: 'pending',
    loadingPayment: true,
    paymentError: null,
    receiptUrl: null,
    invoiceUrl: null
  };

  /* ── pull payload ──────────────────────────────── */
  componentDidMount() {
    let { state } = this.props.location;
    if (!state) {
      const saved = sessionStorage.getItem('confirmData');
      if (saved) state = JSON.parse(saved);
    }

    if (state && state.orderId) {
      this.setState(
        {
          orderId: state.orderId,
          customerId: state.customerId ?? null,
          totalAmount: state.totalAmount
        },
        this.createOrFetchPayment
      );
    } else {
      this.setState({
        loadingPayment: false,
        paymentError: 'Order ID not found. Please go through checkout.'
      });
    }
  }

  /* ── ensure payment ─────────────────────────────── */
  createOrFetchPayment = async () => {
    const { orderId, customerId, totalAmount } = this.state;
    const csrftoken = getCookie('csrftoken');

    try {
      /* 1. existing payment? */
      let payRes = await fetch(`/api/payments/?order=${orderId}`, {
        credentials: 'include'
      });
      let payData = await payRes.json();

      if (!payData.length) {
        /* 2. get a valid payment method pk */
        const pmRes = await fetch('/api/payment-methods/?ordering=id&limit=1', {
          credentials: 'include'
        });
        const [pm] = await pmRes.json();
        if (!pm) throw new Error('No payment methods configured. Ask an admin.');

        /* 3. create payment – amount_paid is the decimal string we stored */
        const createRes = await fetch('/api/payments/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
          },
          credentials: 'include',
          body: JSON.stringify({
            order: orderId,
            customer: customerId,
            payment_method: pm.id,
            amount_paid: totalAmount, // ← valid decimal string like "1200.00"
            status: 'pending'
          })
        });
        payData = [await createRes.json()];
      }

      const paymentId = payData[0].id;

      /* 4. mark payment paid (dummy gateway) */
      await fetch(`/api/payments/${paymentId}/initiate_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken
        },
        credentials: 'include',
        body: JSON.stringify({})
      });

      /* 5. try to fetch receipt / invoice URLs */
      const [receipt] = await (
        await fetch(`/api/receipts/?order=${orderId}`, {
          credentials: 'include'
        })
      ).json();
      const [invoice] = await (
        await fetch(`/api/invoices/?order=${orderId}`, {
          credentials: 'include'
        })
      ).json();

      this.setState({
        paymentStatus: 'paid',
        loadingPayment: false,
        receiptUrl: receipt ? receipt.pdf_url : null,
        invoiceUrl: invoice ? invoice.pdf_url : null
      });
    } catch (err) {
      console.error(err);
      this.setState({ paymentError: err.message, loadingPayment: false });
    }
  };

  /* ── download helpers (unchanged) ──────────────── */
  handleDownload = async endpoint => {
    const { orderId } = this.state;
    const csrftoken = getCookie('csrftoken');
    const res = await fetch(endpoint, { credentials: 'include' });
    const [file] = await res.json();
    if (file && file.id) {
      const dlRes = await fetch(`${endpoint}/${file.id}/download/`, {
        credentials: 'include',
        headers: { 'X-CSRFToken': csrftoken }
      });
      if (dlRes.ok) {
        const { url } = await dlRes.json();
        window.open(url, '_blank');
      }
    }
  };

  /* ── render keeps original classes ─────────────── */
  render() {
    const {
      orderId,
      paymentStatus,
      loadingPayment,
      paymentError,
      receiptUrl,
      invoiceUrl
    } = this.state;

    return (
      <div className="purchase-confirmed">
        <div className="purchase-confirmed__content">
          {loadingPayment ? (
            <>
              <FaCheckCircle className="purchase-confirmed__icon text-yellow-500" />
              <h1>Processing your payment…</h1>
            </>
          ) : paymentError ? (
            <>
              <FaCheckCircle className="purchase-confirmed__icon text-red-500" />
              <h1>Order Processing Failed!</h1>
              <p style={{ color: 'red' }}>{paymentError}</p>
            </>
          ) : (
            <>
              <FaCheckCircle className="purchase-confirmed__icon" />
              <h1>Thank you for your order!</h1>
              <p>
                Order ID <strong>{orderId}</strong> has been&nbsp;
                <strong>{paymentStatus}</strong>.
              </p>
              <div className="purchase-confirmed__buttons">
                {receiptUrl && (
                  <button
                    onClick={() =>
                      this.handleDownload('/api/receipts/?order=' + orderId)
                    }
                  >
                    <IoMdDownload /> Receipt
                  </button>
                )}
                {invoiceUrl && (
                  <button
                    onClick={() =>
                      this.handleDownload('/api/invoices/?order=' + orderId)
                    }
                  >
                    <IoMdDownload /> Invoice
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
}

export default Wrapper;
