/**
 * Food Database Service
 * Provides integration with USDA FoodData Central API for food search and nutrition data
 */

import { db, generateId, nowISO } from '../db/client';
import { foodSearchCache, foodDetailsCache } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';

// USDA API Configuration
const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = 'DEMO_KEY'; // Replace with actual API key in production

// Nutrient IDs from USDA
const NUTRIENT_IDS = {
  CALORIES: 1008,
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
  FIBER: 1079,
} as const;

// Cache expiration in hours
const CACHE_EXPIRATION_HOURS = 24;

/**
 * Food search result from USDA API
 */
export interface FoodSearchResult {
  fdcId: string;
  description: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
}

/**
 * Detailed food information from USDA API
 */
export interface FoodDetails extends FoodSearchResult {
  ingredients?: string;
  dataType: string;
  foodCategory?: string;
  householdServingFullText?: string;
}

/**
 * Raw USDA API response types
 */
interface USDAFoodNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface USDASearchFood {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: USDAFoodNutrient[];
  dataType: string;
}

interface USDASearchResponse {
  foods: USDASearchFood[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
}

interface USDAFoodDetailsResponse {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  ingredients?: string;
  dataType: string;
  foodCategory?: string;
  householdServingFullText?: string;
  foodNutrients: Array<{
    nutrient: {
      id: number;
      name: string;
      unitName: string;
    };
    amount: number;
  }>;
}

/**
 * Extract nutrient value from USDA food nutrients array
 */
function extractNutrient(
  nutrients: USDAFoodNutrient[],
  nutrientId: number
): number {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId);
  return nutrient?.value ?? 0;
}

/**
 * Extract nutrient value from detailed food nutrients array
 */
function extractDetailNutrient(
  nutrients: USDAFoodDetailsResponse['foodNutrients'],
  nutrientId: number
): number {
  const nutrient = nutrients.find((n) => n.nutrient.id === nutrientId);
  return nutrient?.amount ?? 0;
}

/**
 * Map USDA search food to our FoodSearchResult type
 */
function mapSearchFood(food: USDASearchFood): FoodSearchResult {
  return {
    fdcId: String(food.fdcId),
    description: food.description,
    brandName: food.brandName,
    brandOwner: food.brandOwner,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    nutrients: {
      calories: extractNutrient(food.foodNutrients, NUTRIENT_IDS.CALORIES),
      protein: extractNutrient(food.foodNutrients, NUTRIENT_IDS.PROTEIN),
      carbs: extractNutrient(food.foodNutrients, NUTRIENT_IDS.CARBS),
      fat: extractNutrient(food.foodNutrients, NUTRIENT_IDS.FAT),
      fiber: extractNutrient(food.foodNutrients, NUTRIENT_IDS.FIBER) || undefined,
    },
  };
}

/**
 * Map USDA food details to our FoodDetails type
 */
function mapFoodDetails(food: USDAFoodDetailsResponse): FoodDetails {
  return {
    fdcId: String(food.fdcId),
    description: food.description,
    brandName: food.brandName,
    brandOwner: food.brandOwner,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    ingredients: food.ingredients,
    dataType: food.dataType,
    foodCategory: food.foodCategory,
    householdServingFullText: food.householdServingFullText,
    nutrients: {
      calories: extractDetailNutrient(food.foodNutrients, NUTRIENT_IDS.CALORIES),
      protein: extractDetailNutrient(food.foodNutrients, NUTRIENT_IDS.PROTEIN),
      carbs: extractDetailNutrient(food.foodNutrients, NUTRIENT_IDS.CARBS),
      fat: extractDetailNutrient(food.foodNutrients, NUTRIENT_IDS.FAT),
      fiber: extractDetailNutrient(food.foodNutrients, NUTRIENT_IDS.FIBER) || undefined,
    },
  };
}

/**
 * Get cache expiration timestamp
 */
function getCacheExpiration(): string {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + CACHE_EXPIRATION_HOURS);
  return expiration.toISOString();
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(expiresAt: string): boolean {
  return new Date(expiresAt) > new Date();
}

/**
 * Search for foods in the USDA FoodData Central database
 * Results are cached locally for offline access
 */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  // Check cache first
  try {
    const cached = await db
      .select()
      .from(foodSearchCache)
      .where(eq(foodSearchCache.query, normalizedQuery))
      .limit(1);

    if (cached.length > 0 && isCacheValid(cached[0].expires_at)) {
      return JSON.parse(cached[0].results) as FoodSearchResult[];
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }

  // Fetch from API
  try {
    const url = new URL(`${USDA_API_BASE}/foods/search`);
    url.searchParams.set('query', query);
    url.searchParams.set('api_key', USDA_API_KEY);
    url.searchParams.set('pageSize', '25');
    url.searchParams.set('dataType', 'Branded,Survey (FNDDS),Foundation');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data: USDASearchResponse = await response.json();
    const results = data.foods.map(mapSearchFood);

    // Cache the results
    try {
      const cacheId = generateId();
      await db.insert(foodSearchCache).values({
        id: cacheId,
        query: normalizedQuery,
        results: JSON.stringify(results),
        created_at: nowISO(),
        expires_at: getCacheExpiration(),
      }).onConflictDoUpdate({
        target: foodSearchCache.query,
        set: {
          results: JSON.stringify(results),
          created_at: nowISO(),
          expires_at: getCacheExpiration(),
        },
      });
    } catch (cacheError) {
      console.warn('Cache write error:', cacheError);
    }

    return results;
  } catch (error) {
    // If API fails, try to return stale cache
    try {
      const staleCache = await db
        .select()
        .from(foodSearchCache)
        .where(eq(foodSearchCache.query, normalizedQuery))
        .limit(1);

      if (staleCache.length > 0) {
        console.warn('Using stale cache due to API error');
        return JSON.parse(staleCache[0].results) as FoodSearchResult[];
      }
    } catch (cacheError) {
      console.warn('Stale cache read error:', cacheError);
    }

    throw error;
  }
}

/**
 * Get detailed information for a specific food by FDC ID
 * Results are cached locally for offline access
 */
export async function getFoodDetails(fdcId: string): Promise<FoodDetails> {
  // Check cache first
  try {
    const cached = await db
      .select()
      .from(foodDetailsCache)
      .where(eq(foodDetailsCache.fdc_id, fdcId))
      .limit(1);

    if (cached.length > 0 && isCacheValid(cached[0].expires_at)) {
      return JSON.parse(cached[0].data) as FoodDetails;
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }

  // Fetch from API
  try {
    const url = new URL(`${USDA_API_BASE}/food/${fdcId}`);
    url.searchParams.set('api_key', USDA_API_KEY);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data: USDAFoodDetailsResponse = await response.json();
    const details = mapFoodDetails(data);

    // Cache the results
    try {
      await db.insert(foodDetailsCache).values({
        fdc_id: fdcId,
        data: JSON.stringify(details),
        created_at: nowISO(),
        expires_at: getCacheExpiration(),
      }).onConflictDoUpdate({
        target: foodDetailsCache.fdc_id,
        set: {
          data: JSON.stringify(details),
          created_at: nowISO(),
          expires_at: getCacheExpiration(),
        },
      });
    } catch (cacheError) {
      console.warn('Cache write error:', cacheError);
    }

    return details;
  } catch (error) {
    // If API fails, try to return stale cache
    try {
      const staleCache = await db
        .select()
        .from(foodDetailsCache)
        .where(eq(foodDetailsCache.fdc_id, fdcId))
        .limit(1);

      if (staleCache.length > 0) {
        console.warn('Using stale cache due to API error');
        return JSON.parse(staleCache[0].data) as FoodDetails;
      }
    } catch (cacheError) {
      console.warn('Stale cache read error:', cacheError);
    }

    throw error;
  }
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  const now = nowISO();

  try {
    await db.delete(foodSearchCache).where(
      gt(now, foodSearchCache.expires_at)
    );
    await db.delete(foodDetailsCache).where(
      gt(now, foodDetailsCache.expires_at)
    );
  } catch (error) {
    console.warn('Cache cleanup error:', error);
  }
}

/**
 * Clear all food search cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    await db.delete(foodSearchCache);
    await db.delete(foodDetailsCache);
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
}
