import * as types from '../type/index';

const initialState =[];
const reducerUser = (state = initialState, action) => {
  const { type, payload } = action;  
  switch (type) {
    case types.GET_USER: 
      payload ? state = payload :  state = []
      return [...state] 
    default:
      return [...state]   
  }
}

export default reducerUser;

/**
 * reverse() được dùng để đảo ngược thứ tự của các phần tử trong mảng.
 * const type = action.type  dispatch({ type, data })
 */