import * as types from '../type/index';

const initialState =[]
const reducerChangePurchase = (state = initialState, action) => {
  const { type, payload } = action;  
  switch (type) {
    case types.GET_PURCHASE_HEADER:
      payload ? state = payload :  state = []
      return [...state]
    case types.UPDATE_PURCHASE_HEADER:
      if (payload == null) return state;
      return state.filter(item => item.document !== payload); 
      //return state.map(order => order.document === payload ? { ...order, status: 'Mới' } : order);
    default:
      return state
  }
}

export default reducerChangePurchase;
