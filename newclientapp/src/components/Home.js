import React, { Component } from 'react';
import { BsStarFill } from 'react-icons/bs';
import mobilePhone from '../assets/mobilePhone.webp';
import './Home.css';
import AddToCartButton from './Buttons/AddToCartButton.js'

export class Home extends Component {
  static displayName = Home.name;

  render() {
    return (

      <div>

        <div className="hero-container">
          <h1>AWE Electronics</h1>
        </div>
        <section className="featured-products container grid-template">
         
          <div class="card-item">
            <img src={mobilePhone} alt="featured item" class="card__img" />
            <h3 class="card__item-title">Fancy Product</h3>
            <div class="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p class="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton className="btn--centering" buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>

          <div class="card-item">
            <img src={mobilePhone} alt="featured item" class="card__img" />
            <h3 class="card__item-title">Fancy Product</h3>
            <div class="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p class="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>
          <div class="card-item">
            <img src={mobilePhone} alt="featured item" class="card__img" />
            <h3 class="card__item-title">Fancy Product</h3>
            <div class="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p class="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>
          <div class="card-item">
            <img src={mobilePhone} alt="featured item" class="card__img" />
            <h3 class="card__item-title">Fancy Product</h3>
            <div class="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p class="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>
          <div class="card-item">
            <img src={mobilePhone} alt="featured item" class="card__img" />
            <h3 class="card__item-title">Fancy Product</h3>
            <div class="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p class="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>
          <div class="card-item">
            <img src={mobilePhone} alt="featured item" class="card__img" />
            <h3 class="card__item-title">Fancy Product</h3>
            <div class="card__item-rating">
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
              <BsStarFill />
            </div>
            <p class="card__item-price">$40.00 - $80.00</p>
            <AddToCartButton buttonSize="medium-small" buttonWidth="super-slim" buttonText="Add to Cart"/>
          </div>
        </section>
      </div>


      // <div>
      //   {/* Header */}
      //   <header className="bg-dark py-5">
      //     <div className="container px-4 px-lg-5 my-5">
      //       <div className="text-center text-white">
      //         <h1 className="display-4 fw-bolder">Shop in style</h1>
      //         <p className="lead fw-normal text-white-50 mb-0">With this shop homepage template</p>
      //       </div>
      //     </div>
      //   </header>

      //   {/* Section */}
      //   <section className="py-5">
      //     <div className="container px-4 px-lg-5 mt-5">
      //       <div className="row gx-4 gx-lg-5 row-cols-2 row-cols-md-3 row-cols-xl-4 justify-content-center">
      //         {/* Product Card 1 */}
      //         <div className="col mb-5">
      //           <div className="card h-100">
      //             <img className="card-img-top" src="https://dummyimage.com/450x300/dee2e6/6c757d.jpg" alt="..." />
      //             <div className="card-body p-4">
      //               <div className="text-center">
      //                 <h5 className="fw-bolder">Fancy Product</h5>
      //                 $40.00 - $80.00
      //               </div>
      //             </div>
      //             <div className="card-footer p-4 pt-0 border-top-0 bg-transparent">
      //               <div className="text-center">
      //                 <a className="btn btn-outline-dark mt-auto" href="#">View options</a>
      //               </div>
      //             </div>
      //           </div>
      //         </div>

      //         {/* Product Card 2 */}
      //         <div className="col mb-5">
      //           <div className="card h-100">
      //             <div className="badge bg-dark text-white position-absolute" style={{ top: '0.5rem', right: '0.5rem' }}>Sale</div>
      //             <img className="card-img-top" src="https://dummyimage.com/450x300/dee2e6/6c757d.jpg" alt="..." />
      //             <div className="card-body p-4">
      //               <div className="text-center">
      //                 <h5 className="fw-bolder">Special Item</h5>
      //                 <div className="d-flex justify-content-center small text-warning mb-2">
      //                   <BsStarFill />
      //                   <BsStarFill />
      //                   <BsStarFill />
      //                   <BsStarFill />
      //                   <BsStarFill />
      //                 </div>
      //                 <span className="text-muted text-decoration-line-through">$20.00</span>
      //                 $18.00
      //               </div>
      //             </div>
      //             <div className="card-footer p-4 pt-0 border-top-0 bg-transparent">
      //               <div className="text-center">
      //                 <a className="btn btn-outline-dark mt-auto" href="#">Add to cart</a>
      //               </div>
      //             </div>
      //           </div>
      //         </div>

      //         {/* Product Card 3 */}
      //         <div className="col mb-5">
      //           <div className="card h-100">
      //             <div className="badge bg-dark text-white position-absolute" style={{ top: '0.5rem', right: '0.5rem' }}>Sale</div>
      //             <img className="card-img-top" src="https://dummyimage.com/450x300/dee2e6/6c757d.jpg" alt="..." />
      //             <div className="card-body p-4">
      //               <div className="text-center">
      //                 <h5 className="fw-bolder">Sale Item</h5>
      //                 <span className="text-muted text-decoration-line-through">$50.00</span>
      //                 $25.00
      //               </div>
      //             </div>
      //             <div className="card-footer p-4 pt-0 border-top-0 bg-transparent">
      //               <div className="text-center">
      //                 <a className="btn btn-outline-dark mt-auto" href="#">Add to cart</a>
      //               </div>
      //             </div>
      //           </div>
      //         </div>

      //         {/* Product Card 4 */}
      //         <div className="col mb-5">
      //           <div className="card h-100">
      //             <img className="card-img-top" src="https://dummyimage.com/450x300/dee2e6/6c757d.jpg" alt="..." />
      //             <div className="card-body p-4">
      //               <div className="text-center">
      //                 <h5 className="fw-bolder">Popular Item</h5>
      //                 <div className="d-flex justify-content-center small text-warning mb-2">
      //                   <BsStarFill />
      //                   <BsStarFill />
      //                   <BsStarFill />
      //                   <BsStarFill />
      //                   <BsStarFill />
      //                 </div>
      //                 $40.00
      //               </div>
      //             </div>
      //             <div className="card-footer p-4 pt-0 border-top-0 bg-transparent">
      //               <div className="text-center">
      //                 <a className="btn btn-outline-dark mt-auto" href="#">Add to cart</a>
      //               </div>
      //             </div>
      //           </div>
      //         </div>
      //       </div>
      //     </div>
      //   </section>

      //   {/* Footer */}
      //   <footer className="py-5 bg-dark">
      //     <div className="container">
      //       <p className="m-0 text-center text-white">Copyright &copy; AWE Electronics 2024</p>
      //     </div>
      //   </footer>
      // </div>
    );
  }
}
