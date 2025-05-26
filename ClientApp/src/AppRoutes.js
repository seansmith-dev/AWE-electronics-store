import { Counter } from "./components/Counter";
import { FetchData } from "./components/FetchData";
import { Home } from "./components/Home";
import { Shop } from "./components/pages/Shop/Shop";

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
    path: '/counter',
    element: <Counter />
  },
  {
    path: '/fetch-data',
    element: <FetchData />
  }
];

export default AppRoutes;
