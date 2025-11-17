import * as types from '../type/index';

const initialState =[]
const reducerChangePurchaseLine = (state = initialState, action) => {
  const { type, payload } = action;  
  switch (type) {
    case types.GET_PURCHASE_LINE:
      payload ? state = payload :  state = []
      return [...state]
    case types.DELETE_PURCHASE_LINE:
      if (payload == null) return state;
      return state.filter(item => item.ID !== payload); 
    case types.ADD_PURCHASE_LINE:
      if (!state || state.length === 0) {
        return payload ? [...payload] : [];
      } else {
        return payload ? [...state, ...payload] : [...state];
      }
    default:
      return state
  }
}

export default reducerChangePurchaseLine;
