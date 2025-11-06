/**
 * Pickup Details Form Component
 *
 * Form for selecting pickup time and location.
 * Provides time slot selection and validates pickup time is in the future.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';

export interface PickupFormData {
  pickupTime: number; // Unix timestamp
}

export interface PickupFormProps {
  initialData?: Partial<PickupFormData>;
  onChange: (data: PickupFormData, isValid: boolean) => void;
}

/**
 * Generate pickup time slots for the next 3 days
 */
const generateTimeSlots = (): Array<{ label: string; value: number }> => {
  const slots: Array<{ label: string; value: number }> = [];
  const now = new Date();

  // Generate slots for next 3 days
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);

    // Generate time slots: 10 AM to 8 PM (every 2 hours)
    for (let hour = 10; hour <= 20; hour += 2) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, 0, 0, 0);

      // Only show future slots
      if (slotTime.getTime() > now.getTime()) {
        const label = formatTimeSlot(slotTime);
        slots.push({
          label,
          value: slotTime.getTime(),
        });
      }
    }
  }

  return slots;
};

/**
 * Format time slot for display
 */
const formatTimeSlot = (date: Date): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let dayLabel = '';
  if (date.toDateString() === today.toDateString()) {
    dayLabel = 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    dayLabel = 'Tomorrow';
  } else {
    dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  const timeLabel = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dayLabel}, ${timeLabel}`;
};

export const PickupForm: React.FC<PickupFormProps> = ({ initialData, onChange }) => {
  const [selectedTime, setSelectedTime] = useState<number | null>(
    initialData?.pickupTime || null
  );
  const [timeSlots] = useState(() => generateTimeSlots());
  const [error, setError] = useState<string>('');

  /**
   * Handle time slot selection
   */
  const handleSelectTime = (timestamp: number) => {
    setSelectedTime(timestamp);
    setError('');

    // Validate that time is in the future
    if (timestamp < Date.now()) {
      setError('Please select a future pickup time');
      onChange({ pickupTime: timestamp }, false);
    } else {
      onChange({ pickupTime: timestamp }, true);
    }
  };

  /**
   * Validate on mount if initial data exists
   */
  useEffect(() => {
    if (initialData?.pickupTime) {
      handleSelectTime(initialData.pickupTime);
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Select Pickup Time</Text>

      <View style={styles.locationInfo}>
        <Text style={styles.locationLabel}>Pickup Location:</Text>
        <Text style={styles.locationValue}>Main Store Location</Text>
        <Text style={styles.locationAddress}>123 Main Street, City, State 12345</Text>
      </View>

      <Text style={styles.instructions}>
        Select a convenient time to pick up your order. Our store hours are 10 AM to 8 PM daily.
      </Text>

      {timeSlots.length === 0 ? (
        <View style={styles.noSlotsContainer}>
          <Text style={styles.noSlotsText}>
            No pickup slots available at the moment. Please try again later.
          </Text>
        </View>
      ) : (
        <View style={styles.timeSlotsContainer}>
          {timeSlots.map((slot) => (
            <TouchableOpacity
              key={slot.value}
              style={[
                styles.timeSlot,
                selectedTime === slot.value && styles.timeSlotSelected,
              ]}
              onPress={() => handleSelectTime(slot.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeSlotText,
                  selectedTime === slot.value && styles.timeSlotTextSelected,
                ]}
              >
                {slot.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!selectedTime && !error && (
        <Text style={styles.helperText}>
          Please select a pickup time to continue
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  locationInfo: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  timeSlotsContainer: {
    marginTop: 8,
  },
  timeSlot: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  timeSlotSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  timeSlotTextSelected: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  noSlotsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});
