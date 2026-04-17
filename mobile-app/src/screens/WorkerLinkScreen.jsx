import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionCard } from '../components/ActionCard';
import { NoticeStrip } from '../components/NoticeStrip';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { StatusBadge } from '../components/StatusBadge';
import { getWorkerLinkFeedback } from '../features/workers/linkingState';
import { theme } from '../lib/theme/theme';
import { useAuth } from '../features/auth/AuthContext';

const platformOptions = ['swiggy', 'zomato'];

export function WorkerLinkScreen() {
  const { linkWorker } = useAuth();
  const [platformName, setPlatformName] = useState('swiggy');
  const [platformDriverId, setPlatformDriverId] = useState('');
  const [status, setStatus] = useState({ tone: 'info', message: 'Link your worker identity to continue into coverage.' });
  const [submitting, setSubmitting] = useState(false);

  async function handleLink() {
    setSubmitting(true);
    setStatus({ tone: 'info', message: 'Checking worker identity against the current backend.' });

    try {
      await linkWorker({
        platformName,
        platformDriverId
      });
      setStatus({ tone: 'success', message: 'Worker found and linked successfully.' });
    } catch (error) {
      setStatus(getWorkerLinkFeedback(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Worker Linking"
      title="Connect Delivery Identity"
      description="Use your platform name and platform driver ID to connect your worker profile to GIGSurance."
      rightSlot={<StatusBadge tone="primary" label="Required" />}
    >
      <NoticeStrip tone={status.tone} text={status.message} />

      <ActionCard
        eyebrow="Current Step"
        title="Link your platform worker profile"
        body="The backend will validate whether the worker exists, is already linked here, or is already linked to another account."
      />

      <View style={styles.form}>
        <Text style={styles.label}>Platform</Text>
        <View style={styles.optionRow}>
          {platformOptions.map((option) => {
            const active = option === platformName;
            return (
              <PrimaryButton
                key={option}
                label={option}
                onPress={() => setPlatformName(option)}
                disabled={submitting || active}
              />
            );
          })}
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
          label={submitting ? 'Linking...' : 'Link Worker'}
          onPress={handleLink}
          disabled={submitting || platformDriverId.trim().length < 3}
        />
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
