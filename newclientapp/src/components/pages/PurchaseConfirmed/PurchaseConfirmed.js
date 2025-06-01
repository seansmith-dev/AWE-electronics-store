import React, { Component } from 'react';
import './PurchaseConfirmed.css';
import { IoMdDownload } from "react-icons/io";
import { FaCheckCircle } from "react-icons/fa";

export class PurchaseConfirmed extends Component {
    static displayName = PurchaseConfirmed.name;

    handleDownloadReceipt = () => {
        // Implement receipt download logic maybe with a pdf.
        console.log('Downloading receipt...');
    };

    handleDownloadInvoice = () => {
        // Implement invoice download maybe with a pdf
        console.log('Downloading invoice...');
    };

    render() {
        return (
            <div className="purchase-confirmed">
                <div className="purchase-confirmed__content">
                    <FaCheckCircle className="purchase-confirmed__icon" />
                    <h1 className="purchase-confirmed__header">
                        Thank you for your order!
                    </h1>
                    <p className="purchase-confirmed__message">
                        Your order has been successfully placed. You can download your receipt and invoice below.
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
                </div>
            </div>
        );
    }
}
