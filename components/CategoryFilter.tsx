import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip } from 'react-native-paper';
import { INGRIDIENT_CATEGORIES } from '../data/categories';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <View style={styles.categoryContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContent}
      >
        <Chip
          selected={selectedCategory === 'ALL'}
          onPress={() => onCategoryChange('ALL')}
          style={[
            styles.categoryChip,
            selectedCategory === 'ALL' && styles.categoryChipSelected
          ]}
          showSelectedCheck={false}
          mode={selectedCategory === 'ALL' ? 'flat' : 'outlined'}
        >
          Все
        </Chip>
        {Object.values(INGRIDIENT_CATEGORIES).map((category) => (
          <Chip
            key={category.key}
            selected={selectedCategory === category.key}
            onPress={() => onCategoryChange(category.key)}
            style={[
              styles.categoryChip,
              selectedCategory === category.key && styles.categoryChipSelected
            ]}
            showSelectedCheck={false}
            mode={selectedCategory === category.key ? 'flat' : 'outlined'}
          >
            {category.name}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
  },
  categoryScrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#6750A4',
  },
});
