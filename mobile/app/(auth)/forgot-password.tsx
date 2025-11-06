/**
 * Forgot Password Screen
 *
 * Allows users to initiate password reset via phone verification.
 * Sends SMS verification code and navigates to reset password confirmation.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

interface SendVerificationCodeResponse {
  success: boolean;
  expiresAt: number;
  attemptsRemaining: number;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validatePhoneNumber = (phone: string): boolean => {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  };

  const formatPhoneNumber = (text: string) => {
    // Auto-add '+' if not present
    if (text && !text.startsWith('+')) {
      return '+' + text.replace(/[^0-9]/g, '');
    }
    return text.replace(/[^0-9+]/g, '');
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert(
        'Invalid Phone Number',
        'Please use E.164 format (e.g., +12025551234)'
      );
      return;
    }

    setIsLoading(true);

    try {
      const sendVerificationCode = httpsCallable<
        { phoneNumber: string; type: string },
        SendVerificationCodeResponse
      >(functions, 'sendVerificationCode');

      const result = await sendVerificationCode({
        phoneNumber: phoneNumber.trim(),
        type: 'password_reset',
      });

      Alert.alert(
        'Code Sent',
        `Verification code sent to ${phoneNumber}. ${result.data.attemptsRemaining} attempts remaining.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to reset password confirmation with phone number
              router.push({
                pathname: '/(auth)/reset-password',
                params: { phoneNumber: phoneNumber.trim() },
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Send verification code error:', error);

      let errorMessage = 'Failed to send verification code. Please try again.';

      if (error.code === 'functions/not-found') {
        errorMessage = 'No account found with this phone number.';
      } else if (error.code === 'functions/failed-precondition') {
        errorMessage = 'Too many attempts. Please wait 1 hour before trying again.';
      } else if (error.code === 'functions/unavailable') {
        errorMessage = 'SMS service is temporarily unavailable. Please try again later.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to receive a verification code
          </Text>
        </View>

        <View style={styles.form}>
          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+12025551234"
              value={phoneNumber}
              onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
              keyboardType="phone-pad"
              autoComplete="tel"
              onSubmitEditing={handleSendCode}
            />
            <Text style={styles.hint}>
              Use the phone number you registered with
            </Text>
          </View>

          {/* Send Code Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.linkText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Enter your registered phone number{'\n'}
            2. Receive a 6-digit verification code via SMS{'\n'}
            3. Enter the code and set a new password
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
