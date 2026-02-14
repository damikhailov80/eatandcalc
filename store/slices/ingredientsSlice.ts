import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

interface IngredientsState {
  favoriteIds: string[]; // храним только ID избранных ингредиентов
  showOnlyFavorites: boolean; // фильтр для отображения только избранных
}

const initialState: IngredientsState = {
  favoriteIds: [],
  showOnlyFavorites: false,
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
    toggleShowOnlyFavorites: (state) => {
      state.showOnlyFavorites = !state.showOnlyFavorites;
    },
  },
});

// Selectors
export const selectIsFavorite = (state: RootState, ingredientId: string) =>
  state.ingredients.favoriteIds.includes(ingredientId);

export const selectShowOnlyFavorites = (state: RootState) =>
  state.ingredients.showOnlyFavorites;

export const selectFavoriteIds = (state: RootState) =>
  state.ingredients.favoriteIds;

export const { addToFavorite, removeFromFavorite, toggleShowOnlyFavorites } = ingredientsSlice.actions;
export default ingredientsSlice.reducer;
