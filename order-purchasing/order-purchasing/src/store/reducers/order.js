import * as types from '../type/index';

const initialState =[]
const reducerOrder = (state = initialState, action) => {
  const { type, payload } = action; 
  switch (type) {
    case types.GET_CART_BY_USER:
      payload ? state = payload :  state = []
      return [...state] 
    case types.ADD_ORDER:
      if (!state || state.length === 0) {
        return payload ? [...payload] : [];
      } else {
        return payload ? [...state, ...payload] : [...state];
      }
    case types.DELETE_ORDER:
      if (payload == null) return state;
      return state.filter(item => item.id !== payload); // Giữ nguyên thứ tự
    case types.DELETE_ALL_ORDER:
      return []; 
    default:
      return state
  }
}

export default reducerOrder;
