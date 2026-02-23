import React, { useState, useEffect } from 'react';
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

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // ✅ Keyboard visibility listener
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password || (mode === 'signup' && !trimmedName)) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (mode === 'signup') {
      // Name: only letters and spaces, min 2 chars
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

      // Email: basic email format
      if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      // Password: min 6 chars
      if (password.length < 6) {
        Alert.alert('Weak Password', 'Password must be at least 6 characters.');
        return;
      }
    }

    try {
      setLoading(true);

      const result =
        mode === 'login'
          ? await authService.login(trimmedEmail, password)
          : await authService.signup(trimmedName, trimmedEmail, password);

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

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <View style={styles.formContainer}>
          {/* Title */}
          <View style={styles.title}>
            <AppText style={styles.titleText}>
              {mode === 'login' ? 'Welcome Back 👋' : 'Create Account ✨'}
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

          {mode === 'signup' && (
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
          />

          <AppTextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholderTextColor="#999"
            secureTextEntry
          />

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
                : 'Sign Up'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
            disabled={loading}
          >
            <AppText style={styles.toggleText}>
              {mode === 'login'
                ? 'Don’t have an account? Sign up'
                : 'Already have an account? Login'}
            </AppText>
          </TouchableOpacity>
        </View>

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
  formContainer: {
    flex: 1,
    justifyContent: 'center',
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
