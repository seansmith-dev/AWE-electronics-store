import { Counter } from "./components/Counter";
import { FetchData } from "./components/FetchData";
import { Home } from "./components/Home";
import  Shop   from './components/pages/Shop/Shop';
import { Cart} from "./components/pages/Cart/Cart.js"
// Import the wrapper components for Checkout and PurchaseConfirmed
import CheckoutWrapper from "./components/pages/Checkout/Checkout.js"
import PurchaseConfirmedWrapper from "./components/pages/PurchaseConfirmed/PurchaseConfirmed.js"
// Import the new Login and Signup wrapper components
import LoginWrapper from "./components/pages/Auth/Login.js";
import SignupWrapper from "./components/pages/Auth/Signup.js";

const AppRoutes = [
  {
    index: true,
    element: <Home />
  },
  {
    path: '/shop',
    element: <Shop />
  },
  {
    path: '/cart',
    element: <Cart />
  },
  {
    path: '/checkout',
    element: <CheckoutWrapper /> // Use the wrapper component here
  },
  {
    path: '/purchaseConfirmation',
    element: <PurchaseConfirmedWrapper /> // Use the wrapper component here
  },
  {
    path: '/counter',
    element: <Counter />
  },
  {
    path: '/fetch-data',
    element: <FetchData />
  },
  {
    path: '/login', // New route for the Login page
    element: <LoginWrapper />
  },
  {
    path: '/signup', // New route for the Signup page
    element: <SignupWrapper />
  }
];

export default AppRoutes;
