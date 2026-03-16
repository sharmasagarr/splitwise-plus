import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { authService } from '../services/auth.service';
import { setAuth } from '../store/authSlice';
import AppText from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import { API_URL } from '../apollo/client';

const openOAuth = async (url: string) => {
  if (await InAppBrowser.isAvailable()) {
    await InAppBrowser.open(url, {
      dismissButtonStyle: 'close',
      preferredBarTintColor: '#fff',
      preferredControlTintColor: '#000',
      showTitle: true,
      enableDefaultShare: false,
      ephemeralWebSession: false,
    });
  } else {
    Linking.openURL(url);
  }
};

const handleGoogleLogin = () => {
  openOAuth(`${API_URL}/auth/google`);
};

const handleGithubLogin = () => {
  openOAuth(`${API_URL}/auth/github`);
};

const Auth = () => {
  const dispatch = useDispatch();
  const isIOS = Platform.OS === 'ios';

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const formScrollRef = useRef<ScrollView>(null);
  const isSignupPasswordStep = mode === 'signup' && !isOtpStep;

  const scrollFormToBottom = (delay = 120) => {
    setTimeout(() => {
      formScrollRef.current?.scrollToEnd({ animated: true });
    }, delay);
  };

  // ✅ Keyboard visibility listener
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
      if (isSignupPasswordStep || mode === 'login') {
        scrollFormToBottom(100);
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      formScrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isSignupPasswordStep, mode]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    if (mode === 'login' && (!trimmedEmail || !password)) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (mode === 'signup' && !isOtpStep) {
      if (!trimmedEmail || !password || !trimmedName) {
        Alert.alert('Error', 'Please fill all required fields');
        return;
      }

      const isValidName =
        trimmedName.length >= 2 &&
        trimmedName
          .split('')
          .every(
            ch =>
              (ch >= 'a' && ch <= 'z') ||
              (ch >= 'A' && ch <= 'Z') ||
              ch === ' ',
          );
      if (!isValidName) {
        Alert.alert(
          'Invalid Name',
          'Name must be at least 2 characters and contain only letters and spaces.',
        );
        return;
      }

      if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      if (password.length < 6) {
        Alert.alert('Weak Password', 'Password must be at least 6 characters.');
        return;
      }
    }

    if (mode === 'signup' && isOtpStep) {
      if (!trimmedEmail || !trimmedOtp) {
        Alert.alert('Error', 'Please enter your OTP');
        return;
      }

      if (!/^\d{6}$/.test(trimmedOtp)) {
        Alert.alert('Invalid OTP', 'OTP must be a 6-digit code.');
        return;
      }
    }

    try {
      setLoading(true);

      if (mode === 'signup' && !isOtpStep) {
        const result = await authService.signup(trimmedName, trimmedEmail, password);
        setIsOtpStep(true);
        Alert.alert('OTP Sent', result.message);
        return;
      }

      const result =
        mode === 'login'
          ? await authService.login(trimmedEmail, password)
          : await authService.verifySignupOtp(trimmedEmail, trimmedOtp);

      dispatch(
        setAuth({
          token: result.token,
          user: result.user,
        }),
      );
    } catch (err: any) {
      Alert.alert(
        'Authentication Failed',
        err?.message || 'Something went wrong',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert('Error', 'Email is required to resend OTP');
      return;
    }

    try {
      setLoading(true);
      const result = await authService.resendSignupOtp(trimmedEmail);
      Alert.alert('OTP Resent', result.message);
    } catch (err: any) {
      Alert.alert('Resend Failed', err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setIsOtpStep(false);
    setOtp('');
  };

  const scrollContentStyle = {
    ...styles.formScrollContent,
    ...(keyboardVisible ? styles.formScrollContentKeyboard : null),
    paddingBottom: keyboardVisible ? keyboardHeight + 24 : 24,
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={isIOS ? 'padding' : undefined}
      enabled={isIOS}
    >
      <View style={[styles.container, keyboardVisible && styles.containerKeyboardOpen]}>
        <ScrollView
          ref={formScrollRef}
          contentContainerStyle={scrollContentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={isIOS ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
          {/* Title */}
          <View style={styles.title}>
            <AppText style={styles.titleText}>
              {mode === 'login'
                ? 'Welcome Back 👋'
                : isOtpStep
                ? 'Verify Email OTP ✉️'
                : 'Create Account ✨'}
            </AppText>
          </View>

          {/* OAuth */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            style={styles.googleBtn}
            disabled={loading}
          >
            <Image
              source={require('../../assets/images/google-logo.png')}
              style={styles.oauthIcon}
            />
            <AppText style={styles.oauthText}>Continue with Google</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGithubLogin}
            style={styles.githubBtn}
            disabled={loading}
          >
            <Image
              source={require('../../assets/images/github-logo.png')}
              style={styles.oauthIcon}
            />
            <AppText style={styles.oauthText}>Continue with GitHub</AppText>
          </TouchableOpacity>

          <AppText style={styles.orText}>OR</AppText>

          {mode === 'signup' && !isOtpStep && (
            <AppTextInput
              placeholder="Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#999"
            />
          )}

          <AppTextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={mode !== 'signup' || !isOtpStep}
          />

          {mode === 'signup' && isOtpStep ? (
            <>
              <AppText style={styles.otpHint}>Enter the 6-digit OTP sent to your email</AppText>
              <AppTextInput
                placeholder="OTP"
                value={otp}
                onChangeText={setOtp}
                style={styles.input}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                <AppText style={styles.resendText}>Resend OTP</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <AppTextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              onFocus={() => scrollFormToBottom(80)}
              style={styles.input}
              placeholderTextColor="#999"
              secureTextEntry
            />
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.disabledSubmitBtn]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <AppText style={styles.submitText}>
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Login'
                : isOtpStep
                ? 'Verify OTP'
                : 'Sign Up'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleMode}
            disabled={loading}
          >
            <AppText style={styles.toggleText}>
              {mode === 'login'
                ? 'Don’t have an account? Sign up'
                : isOtpStep
                ? 'Back to Login'
                : 'Already have an account? Login'}
            </AppText>
          </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ✅ Bottom logo hidden when keyboard opens */}
        {!keyboardVisible && (
          <View style={styles.bottomLogoContainer}>
            <Image
              source={require('../../assets/images/splitwise-logo.png')}
              style={styles.bottomLogo}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/images/logo-text.png')}
              style={styles.bottomLogoText}
              resizeMode="contain"
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default Auth;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    paddingBottom: 50,
    backgroundColor: '#fff',
  },
  containerKeyboardOpen: {
    paddingBottom: 24,
  },
  formScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formScrollContentKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: 24,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titleText: {
    fontSize: 20,
  },
  googleBtn: {
    backgroundColor: '#ebe5e5ff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  githubBtn: {
    backgroundColor: '#ebe5e5ff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  oauthIcon: {
    width: 25,
    height: 25,
  },
  oauthText: {
    color: '#000',
    fontSize: 13,
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 13,
    marginBottom: 12,
    color: '#000',
  },
  submitBtn: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  disabledSubmitBtn: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
  },
  toggleText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#4f46e5',
  },
  otpHint: {
    marginBottom: 8,
    color: '#555',
    fontSize: 12,
  },
  resendText: {
    color: '#4f46e5',
    textAlign: 'right',
    marginBottom: 4,
    fontSize: 12,
  },
  bottomLogoContainer: {
    position: 'absolute',
    bottom: 24,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 10,
  },
  bottomLogo: {
    width: 36,
    height: 36,
  },
  bottomLogoText: {
    width: 120,
    height: 36,
  },
});
