import * as types from '../type/index';

const initialState =[]
const reducerOrderApproval = (state = initialState, action) => {
  const { type, payload } = action;  
  switch (type) {
    case types.GET_ORDER_APPROVAL:
      payload ? state = payload :  state = []
      return [...state] 
    case types.UPDATE_ORDER_APPROVAL:
      return state.map(order => order.DocumentNo === payload ? { ...order, StatusName: 'Đã duyệt' } : order);
    case types.CANCEL_ORDER_APPROVAL:
      return state.map(order => order.DocumentNo === payload ? { ...order, StatusName: 'Hủy' } : order);
    default:
      return state
  }
}

export default reducerOrderApproval;
