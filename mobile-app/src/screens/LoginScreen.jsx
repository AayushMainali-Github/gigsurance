import { View } from 'react-native';
import { ActionCard } from '../components/ActionCard';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../lib/theme/theme';

export function LoginScreen({ navigation }) {
  return (
    <ScreenShell
      eyebrow="Authentication"
      title="Sign In"
      description="Workers will sign in here to access coverage, premium, and payout information."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <NoticeStrip tone="info" text="Authentication wiring will be added in the backend integration phase." />
        <ActionCard
          eyebrow="Returning Worker"
          title="Access your GIGSurance account"
          body="This screen is part of the auth stack. It will handle login and session restore without exposing admin workflows."
          actionLabel="Go to Sign Up"
          onPress={() => navigation.navigate('Signup')}
        />
      </View>
    </ScreenShell>
  );
}
