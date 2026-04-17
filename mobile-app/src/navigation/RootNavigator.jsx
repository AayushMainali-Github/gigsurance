import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppTabs } from './AppTabs';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../features/auth/AuthContext';
import { getAuthFlowState } from '../features/auth/authState';
import { LoginScreen } from '../screens/LoginScreen';
import { PolicyEnrollScreen } from '../screens/PolicyEnrollScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { WorkerLinkScreen } from '../screens/WorkerLinkScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { isAuthenticated, isRestoring, user } = useAuth();
  const authFlowState = getAuthFlowState({ isAuthenticated, isRestoring, user });

  if (authFlowState === 'restoring') {
    return <LoadingState label="Restoring your session" />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {authFlowState === 'auth' ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : authFlowState === 'worker-link' ? (
        <Stack.Screen name="WorkerLink" component={WorkerLinkScreen} />
      ) : authFlowState === 'policy-enroll' ? (
        <Stack.Screen name="PolicyEnroll" component={PolicyEnrollScreen} />
      ) : (
        <Stack.Screen name="AppTabs" component={AppTabs} />
      )}
    </Stack.Navigator>
  );
}
