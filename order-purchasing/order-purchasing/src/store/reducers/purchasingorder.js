import * as types from '../type/index';

const initialState =[]
const reducerPurchasingOrder = (state = initialState, action) => {
  const { type, payload } = action;  
  switch (type) {
    case types.CHANGE_PURCHASING_ORDER:
      payload ? state = payload :  state = []
      return [...state]
    case types.UPDATE_STATUS_PURCHASING_ORDER:
      return state.map(order => order.document === payload ? { ...order, status: 'Cung Ứng điều chỉnh' } : order);
    case types.STATUS_APPROVAL:
      return state.map(order => order.document === payload ? { ...order, status: 'Chốt' } : order); 
    default:
      return state
  }
}

export default reducerPurchasingOrder;
