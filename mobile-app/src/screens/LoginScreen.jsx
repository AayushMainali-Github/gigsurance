import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { NoticeStrip } from '../components/NoticeStrip';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { useAuth } from '../features/auth/AuthContext';
import { theme } from '../lib/theme/theme';

export function LoginScreen({ navigation }) {
  const { login, getErrorMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('Sign in to view your current coverage, weekly premium, and payouts.');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setSubmitting(true);
    setMessage('Signing you in...');

    try {
      await login({ email, password });
      setMessage('Signed in successfully.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to sign in right now.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Authentication"
      title="Sign In"
      description="Workers will sign in here to access coverage, premium, and payout information."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <NoticeStrip tone="info" text={message} />
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            editable={!submitting}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="rider@example.com"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            value={email}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            editable={!submitting}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <PrimaryButton
            label={submitting ? 'Signing In...' : 'Sign In'}
            onPress={handleLogin}
            disabled={submitting || email.trim().length < 3 || password.length < 8}
          />
          <PrimaryButton
            label="Create Account"
            onPress={() => navigation.navigate('Signup')}
            disabled={submitting}
          />
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: theme.spacing.md
  },
  label: {
    color: theme.colors.textSecondary,
    ...theme.typography.bodyStrong
  },
  input: {
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  }
});
