/**
 * Phone Verification Screen
 *
 * Allows users to verify their phone number with a 6-digit SMS code.
 * Includes resend functionality with rate limiting (max 3 attempts/hour).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store';
import { createSession } from '../../src/services/sessionService';
import { registerFCMToken } from '../../src/services/notificationService';

const functions = getFunctions();

interface SendVerificationCodeResponse {
  success: boolean;
  expiresAt: number;
  attemptsRemaining: number;
}

interface VerifyCodeResponse {
  success: boolean;
  customToken?: string;
}

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Refs for auto-focus
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Auto-send verification code on mount
    handleSendCode();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendCode = async () => {
    if (!user?.phoneNumber) {
      Alert.alert('Error', 'Phone number not found. Please register again.');
      router.replace('/(auth)/register');
      return;
    }

    setIsResending(true);

    try {
      const sendVerificationCode = httpsCallable<
        { phoneNumber: string; type: string },
        SendVerificationCodeResponse
      >(functions, 'sendVerificationCode');

      const result = await sendVerificationCode({
        phoneNumber: user.phoneNumber,
        type: 'registration',
      });

      setAttemptsRemaining(result.data.attemptsRemaining);

      // Set cooldown to prevent spam (60 seconds)
      setResendCooldown(60);

      Alert.alert(
        'Code Sent',
        `Verification code sent to ${user.phoneNumber}. ${result.data.attemptsRemaining} attempts remaining.`
      );
    } catch (error: any) {
      console.error('Send verification code error:', error);

      let errorMessage = 'Failed to send verification code. Please try again.';

      if (error.code === 'functions/failed-precondition') {
        errorMessage = 'Too many attempts. Please wait 1 hour before trying again.';
      } else if (error.code === 'functions/unavailable') {
        errorMessage = 'SMS service is temporarily unavailable. Please try again later.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyCode = async () => {
    const verificationCode = code.join('');

    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code.');
      return;
    }

    if (!user?.phoneNumber) {
      Alert.alert('Error', 'Phone number not found. Please register again.');
      router.replace('/(auth)/register');
      return;
    }

    setIsLoading(true);

    try {
      const verifyCode = httpsCallable<
        { phoneNumber: string; code: string; type: string },
        VerifyCodeResponse
      >(functions, 'verifyCode');

      const result = await verifyCode({
        phoneNumber: user.phoneNumber,
        code: verificationCode,
        type: 'registration',
      });

      if (result.data.success && result.data.customToken) {
        // Sign in with custom token
        await signInWithCustomToken(auth, result.data.customToken);

        // Create session
        if (auth.currentUser) {
          await createSession(auth.currentUser.uid);

          // Register FCM token for push notifications
          await registerFCMToken(auth.currentUser.uid);
        }

        Alert.alert(
          'Success!',
          'Your phone number has been verified.',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Verify code error:', error);

      let errorMessage = 'Invalid verification code. Please try again.';

      if (error.code === 'functions/deadline-exceeded') {
        errorMessage = 'Verification code has expired. Please request a new code.';
      } else if (error.code === 'functions/not-found') {
        errorMessage = 'No pending verification found. Please request a new code.';
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      }

      Alert.alert('Verification Failed', errorMessage);

      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');

    if (digit.length > 1) {
      // Handle paste of multiple digits
      const digits = digit.split('').slice(0, 6);
      const newCode = [...code];

      digits.forEach((d, i) => {
        if (index + i < 6) {
          newCode[index + i] = d;
        }
      });

      setCode(newCode);

      // Focus last filled input or next empty
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      // Single digit input
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      // Auto-focus next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const canResend = resendCooldown === 0 && attemptsRemaining > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Phone Number</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to{'\n'}
          <Text style={styles.phoneNumber}>{user?.phoneNumber}</Text>
        </Text>
      </View>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.codeInput,
              digit && styles.codeInputFilled,
            ]}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={index === 0}
          />
        ))}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Attempts remaining: {attemptsRemaining}
        </Text>
        {resendCooldown > 0 && (
          <Text style={styles.cooldownText}>
            Resend available in {resendCooldown}s
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleVerifyCode}
        disabled={isLoading || code.join('').length !== 6}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <TouchableOpacity
          onPress={handleSendCode}
          disabled={!canResend || isResending}
        >
          <Text
            style={[
              styles.resendLink,
              !canResend && styles.resendLinkDisabled,
            ]}
          >
            {isResending ? 'Sending...' : 'Resend'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Change Phone Number</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    fontWeight: '600',
    color: '#007AFF',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  codeInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 5,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  codeInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cooldownText: {
    fontSize: 12,
    color: '#999',
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#ccc',
  },
  backButton: {
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#666',
  },
});
