import React, { Component } from 'react';
import { BsStarFill } from 'react-icons/bs';
import mobilePhone from '../../../assets/mobilePhone.webp';
import './Shop.css';
import AddToCartButton from '../../Buttons/AddToCartButton.js'

export class Shop extends Component {
  static displayName = Shop.name;

  render() {
    return (
      <div>
        <div className="hero-container background-image--none">
          <h1>Our Products</h1>
        </div>
        <section className="featured-products container grid-template">
          <div className="card-item">
            <img src={mobilePhone} alt="featured item" className="card__img" />
            <h3 className="card__item-title">Fancy Product</h3>
            <div className="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p className="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton className="btn--centering" buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>

          <div className="card-item">
            <img src={mobilePhone} alt="featured item" className="card__img" />
            <h3 className="card__item-title">Fancy Product</h3>
            <div className="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p className="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>

          <div className="card-item">
            <img src={mobilePhone} alt="featured item" className="card__img" />
            <h3 className="card__item-title">Fancy Product</h3>
            <div className="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p className="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>

          <div className="card-item">
            <img src={mobilePhone} alt="featured item" className="card__img" />
            <h3 className="card__item-title">Fancy Product</h3>
            <div className="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p className="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>

          <div className="card-item">
            <img src={mobilePhone} alt="featured item" className="card__img" />
            <h3 className="card__item-title">Fancy Product</h3>
            <div className="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p className="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>

          <div className="card-item">
            <img src={mobilePhone} alt="featured item" className="card__img" />
            <h3 className="card__item-title">Fancy Product</h3>
            <div className="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p className="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>
        </section>
      </div>
    );
  }
} 