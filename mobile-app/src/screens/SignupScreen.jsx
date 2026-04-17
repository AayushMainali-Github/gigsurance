import { View } from 'react-native';
import { ActionCard } from '../components/ActionCard';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../lib/theme/theme';

export function SignupScreen({ navigation }) {
  return (
    <ScreenShell
      eyebrow="Authentication"
      title="Create Account"
      description="Workers will create an account here before linking their delivery identity and activating coverage."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <NoticeStrip tone="success" text="The auth stack is now separated from the main worker app flow." />
        <ActionCard
          eyebrow="New Worker"
          title="Set up your worker account"
          body="Signup will later connect to backend auth, then continue into worker linking and policy enrollment."
          actionLabel="Back to Sign In"
          onPress={() => navigation.navigate('Login')}
        />
      </View>
    </ScreenShell>
  );
}
