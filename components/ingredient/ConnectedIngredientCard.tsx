import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToFavorite, removeFromFavorite, selectIsFavorite } from '../../store/slices/ingredientsSlice';
import { IngredientCard } from './IngredientCard';
import { Ingridient } from '../../types/ingridient';
import type { RootState, AppDispatch } from '../../store';

interface ConnectedIngredientCardProps {
  ingredient: Ingridient;
  isActive?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Обертка над IngredientCard с подключением к Redux store.
 * Автоматически управляет состоянием избранного через Redux.
 */
export const ConnectedIngredientCard: React.FC<ConnectedIngredientCardProps> = ({
  ingredient,
  ...props
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const isFavorite = useSelector((state: RootState) =>
    selectIsFavorite(state, ingredient.id)
  );

  const handleToggleFavorite = () => {
    if (isFavorite) {
      dispatch(removeFromFavorite(ingredient.id));
    } else {
      dispatch(addToFavorite(ingredient.id));
    }
  };

  return (
    <IngredientCard
      {...props}
      ingredient={{ ...ingredient, isFavorite }}
      onToggleFavorite={handleToggleFavorite}
    />
  );
};
