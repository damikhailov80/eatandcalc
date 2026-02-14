import { MeasurementUnit, MEASUREMENT_UNITS } from './units';

export interface Ingridient {
  id: string;
  name: string;
  category: string;
  calories: number; // kcal per 100g
  protein: number;  // g per 100g
  fat: number;      // g per 100g
  carbs: number;    // g per 100g
  measurementUnits: MeasurementUnit[]; // дополнительные единицы измерения (граммы добавляются автоматически)
  description?: string; // краткое описание продукта
  isDeleted?: boolean; // флаг для удалённых продуктов (используется только в админ-режиме)
  isFavorite?: boolean; // флаг для избранных продуктов
}