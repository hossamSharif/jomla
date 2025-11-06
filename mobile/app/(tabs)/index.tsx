/**
 * Offers List Screen (Home Tab)
 *
 * Displays all active offers with real-time updates.
 * Users can tap on offers to view details and add to cart.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useOffers } from '../../src/hooks/useOffers';
import { OfferCard } from '../../src/components/OfferCard';
import { Offer } from '../../../shared/types/offer';

export default function OffersListScreen() {
  const { data: offers, isLoading, isError, error, refetch, isRefetching } = useOffers();

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text style={styles.loadingText}>Loading offers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Unable to Load Offers</Text>
          <Text style={styles.errorMessage}>
            {error?.message || 'Please check your internet connection and try again.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render empty state
  if (!offers || offers.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>No Offers Available</Text>
          <Text style={styles.emptyMessage}>
            Check back later for exciting deals and bundles!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render offer list
  const renderOffer = ({ item }: { item: Offer }) => (
    <OfferCard offer={item} />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Special Offers</Text>
        <Text style={styles.headerSubtitle}>
          {offers.length} {offers.length === 1 ? 'offer' : 'offers'} available
        </Text>
      </View>

      {/* Offers List */}
      <FlatList
        data={offers}
        renderItem={renderOffer}
        keyExtractor={(item) => item.id}
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
  },
  listContent: {
    paddingTop: 16,
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
