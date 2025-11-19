import { combineReducers } from 'redux'
import reducerUser from './user';
import reducerOrder from './order';
import reducerOrderApproval from './orderapproval';
import reducerPurchasingOrder from './purchasingorder';
import reducerChangePurchase from './change_purchase';
import reducerChangePurchaseLine from './change_purchase_line';

const rootReducer = combineReducers({
  user: reducerUser,
  order: reducerOrder,
  orderapproval: reducerOrderApproval,
  purchasingorder: reducerPurchasingOrder,
  changePurchase: reducerChangePurchase,
  changePurchaseLine: reducerChangePurchaseLine
})

export default rootReducer;
