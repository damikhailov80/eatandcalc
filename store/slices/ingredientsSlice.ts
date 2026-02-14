import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

interface IngredientsState {
  favoriteIds: string[]; // храним только ID избранных ингредиентов
}

const initialState: IngredientsState = {
  favoriteIds: [],
};

const ingredientsSlice = createSlice({
  name: 'ingredients',
  initialState,
  reducers: {
    addToFavorite: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (!state.favoriteIds.includes(id)) {
        state.favoriteIds.push(id);
      }
    },
    removeFromFavorite: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.favoriteIds = state.favoriteIds.filter(favoriteId => favoriteId !== id);
    },
  },
});

// Selectors
export const selectIsFavorite = (state: RootState, ingredientId: string) =>
  state.ingredients.favoriteIds.includes(ingredientId);

export const { addToFavorite, removeFromFavorite } = ingredientsSlice.actions;
export default ingredientsSlice.reducer;
