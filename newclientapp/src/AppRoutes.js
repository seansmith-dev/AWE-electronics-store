import { Counter } from "./components/Counter";
import { FetchData } from "./components/FetchData";
import { Home } from "./components/Home";
import { Shop } from "./components/pages/Shop/Shop";
import { Cart} from "./components/pages/Cart/Cart.js"
import { Checkout } from "./components/pages/Checkout/Checkout.js"
import { PurchaseConfirmed } from "./components/pages/PurchaseConfirmed/PurchaseConfirmed.js"

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
    element: <Checkout />
  },
  {
    path: '/purchaseConfirmation',
    element: <PurchaseConfirmed />
  },
  {
    path: '/counter',
    element: <Counter />
  },
  {
    path: '/fetch-data',
    element: <FetchData />
  }
];

export default AppRoutes;
