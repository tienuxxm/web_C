import Login from '../pages/Login';
import RequestGoods from '../pages/Purchasing/RequestGoods';
import ApproveOrders from '../pages/Purchasing/ApproveOrders';
import Report from '../pages/Purchasing/Report';
import History from '../pages/Purchasing/History';
import Statistical from  '../pages/Supply/Statistical';
import ChangeOrder from  '../pages/Supply/ChangeOrder';
import Adjust from  '../pages/Purchasing/Adjust';
import Merge from  '../pages/Supply/Merge';
import MergeOrder from  '../pages/Supply/MergeOrder';
import Error404 from '../components/Error404';
import HeaderOnly from '../components/Layout/HeaderOnly';

const token = localStorage.getItem('access_token');
const role = JSON.parse(localStorage.getItem('role') || '""');

var publicRoutes = [
  { path: '/', component: Login, layout: null },
  { path: '*', component: Error404, layout: null }
];

const routeByRoles = {
  Administrator: [
    { path: '/purchasing/request-goods', component: RequestGoods, layout: HeaderOnly },
    { path: '/purchasing/approve-orders', component: ApproveOrders, layout: HeaderOnly },
    { path: '/purchasing/report-statistics', component: Report, layout: HeaderOnly },
    { path: '/supply/statistical', component: Statistical, layout: HeaderOnly },
    { path: '/supply/change', component: ChangeOrder, layout: HeaderOnly },
    { path: '/purchasing/adjust', component: Adjust, layout: HeaderOnly },
    { path: '/purchasing/history', component: History, layout: HeaderOnly },
    { path: '/supply/merge', component: Merge, layout: HeaderOnly },
    { path: '/supply/merge/:document', component: MergeOrder, layout: HeaderOnly },
  ],
  Leader: [
    { path: '/purchasing/report-statistics', component: Report, layout: HeaderOnly },
    { path: '/purchasing/approve-orders', component: ApproveOrders, layout: HeaderOnly }
  ],
  Supply: [
    { path: '/purchasing/report-statistics', component: Report, layout: HeaderOnly },
    { path: '/supply/statistical', component: Statistical, layout: HeaderOnly },
    { path: '/supply/change', component: ChangeOrder, layout: HeaderOnly },
    { path: '/supply/merge', component: Merge, layout: HeaderOnly },
    { path: '/supply/merge/:document', component: MergeOrder, layout: HeaderOnly },
  ],
  Sales: [
    { path: '/purchasing/request-goods', component: RequestGoods, layout: HeaderOnly },
    { path: '/purchasing/report-statistics', component: Report, layout: HeaderOnly },
    { path: '/purchasing/adjust', component: Adjust, layout: HeaderOnly },
    { path: '/purchasing/history', component: History, layout: HeaderOnly }
  ]
};

if (token) {
  const routesForRole = routeByRoles[role] || [];
  publicRoutes = [...routesForRole, ...publicRoutes];
} else {
  publicRoutes = [...publicRoutes];
}

const privateRoutes = []
export { publicRoutes, privateRoutes }