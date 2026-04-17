import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { NoticeStrip } from '../components/NoticeStrip';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { useAuth } from '../features/auth/AuthContext';
import { theme } from '../lib/theme/theme';

export function SignupScreen({ navigation }) {
  const { signup, getErrorMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [platformName, setPlatformName] = useState('swiggy');
  const [platformDriverId, setPlatformDriverId] = useState('');
  const [message, setMessage] = useState('Create your worker account and connect your delivery identity in one step.');
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup() {
    setSubmitting(true);
    setMessage('Creating your account...');

    try {
      await signup({ email, password, platformName, platformDriverId });
      setMessage('Account created successfully.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to create your account right now.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Authentication"
      title="Create Account"
      description="Workers will create an account here before linking their delivery identity and activating coverage."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <NoticeStrip tone="success" text={message} />
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

          <Text style={styles.label}>Platform</Text>
          <View style={styles.optionRow}>
            {['swiggy', 'zomato'].map((option) => (
              <PrimaryButton
                key={option}
                label={option}
                onPress={() => setPlatformName(option)}
                disabled={submitting || option === platformName}
              />
            ))}
          </View>

          <Text style={styles.label}>Platform Driver ID</Text>
          <TextInput
            autoCapitalize="characters"
            editable={!submitting}
            onChangeText={setPlatformDriverId}
            placeholder="SWIGGY-DEL-00000145"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            value={platformDriverId}
          />

          <PrimaryButton
            label={submitting ? 'Creating Account...' : 'Create Account'}
            onPress={handleSignup}
            disabled={submitting || email.trim().length < 3 || password.length < 8 || platformDriverId.trim().length < 3}
          />
          <PrimaryButton
            label="Back to Sign In"
            onPress={() => navigation.navigate('Login')}
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
  optionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm
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
