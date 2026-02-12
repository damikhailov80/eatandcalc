import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Chip, Button } from 'react-native-paper';
import { Ingridient } from '../types/ingridient';
import { INGRIDIENT_CATEGORIES } from '../data/categories';

interface IngredientCardProps {
  ingredient: Ingridient;
  isActive?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({
  ingredient,
  isActive = false,
  onPress,
  onEdit,
  onDelete
}) => {
  const categoryName = INGRIDIENT_CATEGORIES[ingredient.category]?.name || ingredient.category;

  return (
    <Card
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
      mode={isActive ? 'elevated' : 'outlined'}
    >
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.name}>
            {ingredient.name}
          </Text>
          <Chip compact>{categoryName}</Chip>
        </View>

        <View style={styles.nutritionContainer}>
          <View style={styles.nutritionItem}>
            <Text variant="labelSmall" style={styles.label}>
              Калории
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {ingredient.calories} ккал
            </Text>
          </View>

          <View style={styles.nutritionItem}>
            <Text variant="labelSmall" style={styles.label}>
              Белки
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {ingredient.protein} г
            </Text>
          </View>

          <View style={styles.nutritionItem}>
            <Text variant="labelSmall" style={styles.label}>
              Жиры
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {ingredient.fat} г
            </Text>
          </View>

          <View style={styles.nutritionItem}>
            <Text variant="labelSmall" style={styles.label}>
              Углеводы
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {ingredient.carbs} г
            </Text>
          </View>
        </View>

        {isActive && (
          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              onPress={onEdit}
              style={styles.button}
              icon="pencil"
            >
              Редактировать
            </Button>
            <Button
              mode="contained"
              onPress={onDelete}
              style={styles.button}
              buttonColor="#d32f2f"
              icon="delete"
            >
              Удалить
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 8,
    marginVertical: 8,
  },
  cardActive: {
    borderColor: '#6200ee',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    flex: 1,
    marginRight: 8,
  },
  nutritionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  nutritionItem: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    opacity: 0.6,
    marginBottom: 4,
  },
  value: {
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  button: {
    flex: 1,
  },
});
