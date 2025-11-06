/**
 * Delivery Details Form Component
 *
 * Form for collecting delivery address and instructions.
 * Validates required fields and provides user feedback.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

export interface DeliveryFormData {
  address: string;
  city: string;
  postalCode: string;
  notes: string;
}

export interface DeliveryFormProps {
  initialData?: Partial<DeliveryFormData>;
  onChange: (data: DeliveryFormData, isValid: boolean) => void;
}

export const DeliveryForm: React.FC<DeliveryFormProps> = ({ initialData, onChange }) => {
  const [formData, setFormData] = useState<DeliveryFormData>({
    address: initialData?.address || '',
    city: initialData?.city || '',
    postalCode: initialData?.postalCode || '',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DeliveryFormData, string>>>({});

  /**
   * Validate form fields
   */
  const validateForm = (data: DeliveryFormData): boolean => {
    const newErrors: Partial<Record<keyof DeliveryFormData, string>> = {};

    // Address is required
    if (!data.address.trim()) {
      newErrors.address = 'Delivery address is required';
    } else if (data.address.trim().length < 5) {
      newErrors.address = 'Please enter a complete address';
    }

    // City is required
    if (!data.city.trim()) {
      newErrors.city = 'City is required';
    } else if (data.city.trim().length < 2) {
      newErrors.city = 'Please enter a valid city name';
    }

    // Postal code is required and should be valid format
    if (!data.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(data.postalCode.trim())) {
      newErrors.postalCode = 'Please enter a valid postal code (e.g., 12345 or 12345-6789)';
    }

    // Notes are optional, no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle field change
   */
  const handleChange = (field: keyof DeliveryFormData, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }

    // Validate and notify parent
    const isValid = validateForm(newData);
    onChange(newData, isValid);
  };

  /**
   * Handle field blur (validate on blur)
   */
  const handleBlur = (field: keyof DeliveryFormData) => {
    validateForm(formData);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>

        {/* Address Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Street Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.address && styles.inputError]}
            value={formData.address}
            onChangeText={(value) => handleChange('address', value)}
            onBlur={() => handleBlur('address')}
            placeholder="123 Main Street, Apt 4B"
            placeholderTextColor="#999"
            autoCapitalize="words"
            autoComplete="street-address"
            returnKeyType="next"
          />
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
        </View>

        {/* City Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            City <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.city && styles.inputError]}
            value={formData.city}
            onChangeText={(value) => handleChange('city', value)}
            onBlur={() => handleBlur('city')}
            placeholder="New York"
            placeholderTextColor="#999"
            autoCapitalize="words"
            autoComplete="address-line2"
            returnKeyType="next"
          />
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
        </View>

        {/* Postal Code Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Postal Code <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.postalCode && styles.inputError]}
            value={formData.postalCode}
            onChangeText={(value) => handleChange('postalCode', value)}
            onBlur={() => handleBlur('postalCode')}
            placeholder="12345"
            placeholderTextColor="#999"
            keyboardType="numeric"
            autoComplete="postal-code"
            returnKeyType="next"
            maxLength={10}
          />
          {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
        </View>

        {/* Delivery Notes Input (Optional) */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Delivery Instructions (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(value) => handleChange('notes', value)}
            placeholder="Leave at door, Ring bell, etc."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            returnKeyType="done"
          />
        </View>

        <Text style={styles.helperText}>
          <Text style={styles.required}>*</Text> Required fields
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: '#FF0000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  inputError: {
    borderColor: '#FF0000',
    borderWidth: 2,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
});
