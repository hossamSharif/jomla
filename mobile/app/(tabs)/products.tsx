/**
 * Products List Screen
 *
 * Displays all active products in a grid layout.
 * Users can filter by category and search products.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useProducts, useProductCategories, useProductSearch } from '../../src/hooks/useProducts';
import { ProductCard } from '../../src/components/ProductCard';
import { Product } from '../../../shared/types/product';

export default function ProductsListScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch all products or search results
  const {
    data: allProducts,
    isLoading: isLoadingProducts,
    isError,
    error,
    refetch,
    isRefetching,
  } = useProducts();

  // Fetch categories
  const { data: categories } = useProductCategories();

  // Search products (only when search query is >= 2 characters)
  const { data: searchResults, isLoading: isSearching } = useProductSearch(
    searchQuery,
    searchQuery.length >= 2
  );

  // Determine which products to display
  const displayProducts = searchQuery.length >= 2
    ? searchResults
    : selectedCategory
    ? allProducts?.filter((p) => p.category === selectedCategory)
    : allProducts;

  const isLoading = isLoadingProducts || (searchQuery.length >= 2 && isSearching);

  // Render loading state
  if (isLoading && !allProducts) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Unable to Load Products</Text>
          <Text style={styles.errorMessage}>
            {error?.message || 'Please check your internet connection and try again.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render product item in grid
  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} />
  );

  // Render category filter chip
  const renderCategoryChip = (category: string) => {
    const isSelected = selectedCategory === category;
    return (
      <TouchableOpacity
        key={category}
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => setSelectedCategory(isSelected ? null : category)}
      >
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {category}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category Filters */}
        {categories && categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilters}
          >
            {categories.map(renderCategoryChip)}
          </ScrollView>
        )}

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {displayProducts?.length || 0} {displayProducts?.length === 1 ? 'product' : 'products'}
          {selectedCategory && ` in ${selectedCategory}`}
          {searchQuery.length >= 2 && ` matching "${searchQuery}"`}
        </Text>
      </View>

      {/* Products Grid */}
      {displayProducts && displayProducts.length > 0 ? (
        <FlatList
          data={displayProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2ECC71"
              colors={['#2ECC71']}
            />
          }
          ListFooterComponent={<View style={styles.listFooter} />}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptyMessage}>
            {searchQuery.length >= 2
              ? `No products matching "${searchQuery}"`
              : selectedCategory
              ? `No products in ${selectedCategory}`
              : 'No products available at the moment'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#1A1A1A',
  },
  categoryFilters: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipSelected: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  chipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  resultsCount: {
    fontSize: 13,
    color: '#888888',
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  listFooter: {
    height: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E74C3C',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
