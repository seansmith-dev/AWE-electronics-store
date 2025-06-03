import React, { Component } from 'react';
import './PurchaseConfirmed.css';
import { IoMdDownload } from "react-icons/io";
import { FaCheckCircle } from "react-icons/fa";
import { useLocation, useNavigate } from 'react-router-dom'; // Import hooks for location and navigation

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

// Functional component wrapper to use hooks
function PurchaseConfirmedWrapper() {
    const location = useLocation();
    const navigate = useNavigate();
    return <PurchaseConfirmed location={location} navigate={navigate} />;
}

export class PurchaseConfirmed extends Component {
    static displayName = PurchaseConfirmed.name;

    constructor(props) {
        super(props);
        this.state = {
            orderId: null,
            totalAmount: 0,
            customerId: null, // New state to hold customer ID
            paymentId: null,
            paymentStatus: 'pending',
            loadingPayment: true,
            paymentError: null,
            receiptUrl: null,
            invoiceUrl: null,
        };
    }

    componentDidMount() {
        // Get orderId, totalAmount, and customerId from location state (passed from Checkout)
        const { state } = this.props.location;
        if (state && state.orderId && state.customerId) { // Ensure customerId is also present
            this.setState({
                orderId: state.orderId,
                totalAmount: state.totalAmount || 0,
                customerId: state.customerId, // Set customerId from state
            }, () => {
                // Once orderId and customerId are set, proceed to initiate payment
                this.initiatePaymentForOrder(state.orderId, state.customerId, state.totalAmount);
            });
        } else {
            this.setState({ loadingPayment: false, paymentError: "Order ID or Customer ID not found. Please go through checkout." });
            // Optionally redirect back to shop or cart if no order ID is found
            // this.props.navigate('/shop');
        }
    }

    /**
     * Fetches or creates a Payment object for the given order and then initiates it.
     * @param {number} orderId - The ID of the order to pay for.
     * @param {number} customerId - The ID of the customer.
     * @param {number} totalAmount - The total amount of the order.
     */
    initiatePaymentForOrder = async (orderId, customerId, totalAmount) => {
        this.setState({ loadingPayment: true, paymentError: null });
        const csrftoken = getCookie('csrftoken'); // Get the CSRF token

        try {
            // First, try to find an existing pending payment for this order
            let paymentId = null;
            const paymentsResponse = await fetch(`/api/payments/?order=${orderId}`, { credentials: 'include' });
            if (!paymentsResponse.ok) {
                const errorData = await paymentsResponse.json();
                throw new Error(`Failed to fetch payments: ${JSON.stringify(errorData)}`);
            }
            const paymentsData = await paymentsResponse.json();

            if (paymentsData.length > 0) {
                // Found an existing payment, use its ID
                paymentId = paymentsData[0].id;
                this.setState({ paymentStatus: paymentsData[0].status });
            } else {
                // If no payment exists, create a new one
                const createPaymentResponse = await fetch('/api/payments/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrftoken, // Include the CSRF token header
                    },
                    credentials: 'include', // Send session cookies
                    body: JSON.stringify({
                        order: orderId,
                        customer: customerId, // Use the customerId passed from Checkout
                        payment_method: 1, // Assuming PaymentMethod ID 1 exists (e.g., 'Credit Card'). You might need to make this dynamic.
                        amount_paid: parseFloat(totalAmount), // Ensure amount is float
                        status: 'pending'
                    })
                });

                if (!createPaymentResponse.ok) {
                    const errorData = await createPaymentResponse.json();
                    throw new Error(`Failed to create payment record: ${JSON.stringify(errorData)}`);
                }
                const newPaymentData = await createPaymentResponse.json();
                paymentId = newPaymentData.id;
                this.setState({ paymentStatus: newPaymentData.status });
            }

            // Now, initiate the payment using the paymentId
            const initiateResponse = await fetch(`/api/payments/${paymentId}/initiate_payment/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken, // Include the CSRF token header
                },
                credentials: 'include', // Send session cookies
                body: JSON.stringify({}), // Empty body for this action
            });

            if (!initiateResponse.ok) {
                const errorData = await initiateResponse.json();
                throw new Error(`Failed to initiate payment: ${JSON.stringify(errorData)}`);
            }

            const initiatedPaymentData = await initiateResponse.json();
            console.log('Payment initiated successfully:', initiatedPaymentData);

            // Fetch receipt and invoice URLs after payment is initiated
            const receiptResponse = await fetch(`/api/receipts/?order=${orderId}`, { credentials: 'include' });
            const receiptData = await receiptResponse.json();
            const invoiceResponse = await fetch(`/api/invoices/?order=${orderId}`, { credentials: 'include' });
            const invoiceData = await invoiceResponse.json();

            const receiptUrl = receiptData.length > 0 ? receiptData[0].pdf_url : null;
            const invoiceUrl = invoiceData.length > 0 ? invoiceData[0].pdf_url : null;

            this.setState({
                paymentId: initiatedPaymentData.id,
                paymentStatus: initiatedPaymentData.status,
                loadingPayment: false,
                receiptUrl: receiptUrl,
                invoiceUrl: invoiceUrl,
            });

        } catch (error) {
            console.error("Error during payment initiation:", error);
            this.setState({ paymentError: error.message, loadingPayment: false });
        }
    };

    /**
     * Handles downloading the receipt.
     */
    handleDownloadReceipt = async () => {
        const { orderId } = this.state;
        if (!orderId) {
            alert("No order ID available to download receipt.");
            return;
        }
        const csrftoken = getCookie('csrftoken'); // Get the CSRF token

        try {
            // Fetch the receipt for the order
            const receiptsResponse = await fetch(`/api/receipts/?order=${orderId}`, { credentials: 'include' });
            if (!receiptsResponse.ok) {
                const errorData = await receiptsResponse.json();
                throw new Error(`Failed to fetch receipt: ${JSON.stringify(errorData)}`);
            }
            const receiptsData = await receiptsResponse.json();
            const receipt = receiptsData.length > 0 ? receiptsData[0] : null;

            if (receipt && receipt.id) {
                const downloadResponse = await fetch(`/api/receipts/${receipt.id}/download/`, {
                    credentials: 'include',
                    headers: {
                        // While GET requests typically don't need X-CSRFToken,
                        // custom actions might be configured to require it.
                        'X-CSRFToken': csrftoken,
                    },
                });
                if (!downloadResponse.ok) {
                    const errorData = await downloadResponse.json();
                    throw new Error(`Failed to download receipt: ${JSON.stringify(errorData)}`);
                }
                const data = await downloadResponse.json();
                // In a real app, you'd redirect to data.url or trigger a file download
                if (data.url) {
                    window.open(data.url, '_blank'); // Open PDF in new tab
                    console.log('Downloading receipt from:', data.url);
                } else {
                    alert('Receipt PDF URL not available.');
                }
            } else {
                alert('No receipt found for this order.');
            }
        } catch (error) {
            console.error('Error downloading receipt:', error);
            alert(`Error downloading receipt: ${error.message}`);
        }
    };

    /**
     * Handles downloading the invoice.
     */
    handleDownloadInvoice = async () => {
        const { orderId } = this.state;
        if (!orderId) {
            alert("No order ID available to download invoice.");
            return;
        }
        const csrftoken = getCookie('csrftoken'); // Get the CSRF token

        try {
            // Fetch the invoice for the order
            const invoicesResponse = await fetch(`/api/invoices/?order=${orderId}`, { credentials: 'include' });
            if (!invoicesResponse.ok) {
                const errorData = await invoicesResponse.json();
                throw new Error(`Failed to fetch invoice: ${JSON.stringify(errorData)}`);
            }
            const invoicesData = await invoicesResponse.json();
            const invoice = invoicesData.length > 0 ? invoicesData[0] : null;

            if (invoice && invoice.id) {
                const downloadResponse = await fetch(`/api/invoices/${invoice.id}/download/`, {
                    credentials: 'include',
                    headers: {
                        // While GET requests typically don't need X-CSRFToken,
                        // custom actions might be configured to require it.
                        'X-CSRFToken': csrftoken,
                    },
                });
                if (!downloadResponse.ok) {
                    const errorData = await downloadResponse.json();
                    throw new Error(`Failed to download invoice: ${JSON.stringify(errorData)}`);
                }
                const data = await downloadResponse.json();
                if (data.url) {
                    window.open(data.url, '_blank'); // Open PDF in new tab
                    console.log('Downloading invoice from:', data.url);
                } else {
                    alert('Invoice PDF URL not available.');
                }
            } else {
                alert('No invoice found for this order.');
            }
        } catch (error) {
            console.error('Error downloading invoice:', error);
            alert(`Error downloading invoice: ${error.message}`);
        }
    };

    render() {
        const { orderId, paymentStatus, loadingPayment, paymentError } = this.state;

        return (
            <div className="purchase-confirmed">
                <div className="purchase-confirmed__content">
                    {loadingPayment ? (
                        <>
                            <FaCheckCircle className="purchase-confirmed__icon text-yellow-500" />
                            <h1 className="purchase-confirmed__header">Processing your order...</h1>
                            <p className="purchase-confirmed__message">Please wait while we confirm your payment.</p>
                        </>
                    ) : paymentError ? (
                        <>
                            <FaCheckCircle className="purchase-confirmed__icon text-red-500" />
                            <h1 className="purchase-confirmed__header">Order Processing Failed!</h1>
                            <p className="purchase-confirmed__message" style={{ color: 'red' }}>
                                Error: {paymentError}
                            </p>
                            <p className="purchase-confirmed__message">
                                Please try again or contact support.
                            </p>
                        </>
                    ) : (
                        <>
                            <FaCheckCircle className="purchase-confirmed__icon" />
                            <h1 className="purchase-confirmed__header">
                                Thank you for your order!
                            </h1>
                            <p className="purchase-confirmed__message">
                                Your order (ID: {orderId}) has been successfully placed and payment is {paymentStatus}.
                                You can download your receipt and invoice below.
                            </p>
                            <div className="purchase-confirmed__buttons">
                                <button
                                    className="purchase-confirmed__button"
                                    onClick={this.handleDownloadReceipt}
                                >
                                    <div className="button__container">
                                        <IoMdDownload className="button__icon" />
                                        <span className="button__text">Download Receipt</span>
                                    </div>
                                </button>
                                <button
                                    className="purchase-confirmed__button"
                                    onClick={this.handleDownloadInvoice}
                                >
                                    <div className="button__container">
                                        <IoMdDownload className="button__icon" />
                                        <span className="button__text">Download Invoice</span>
                                    </div>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }
}

export default PurchaseConfirmedWrapper; // Export the wrapper
