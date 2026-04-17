import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppTabs } from './AppTabs';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../features/auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { PolicyEnrollScreen } from '../screens/PolicyEnrollScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { WorkerLinkScreen } from '../screens/WorkerLinkScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { isAuthenticated, isRestoring, user } = useAuth();

  if (isRestoring) {
    return <LoadingState label="Restoring your session" />;
  }

  const needsWorkerLink = isAuthenticated && !user?.linkedWorker;
  const needsPolicyEnrollment = isAuthenticated && user?.linkedWorker && !user?.currentPolicy;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : needsWorkerLink ? (
        <Stack.Screen name="WorkerLink" component={WorkerLinkScreen} />
      ) : needsPolicyEnrollment ? (
        <Stack.Screen name="PolicyEnroll" component={PolicyEnrollScreen} />
      ) : (
        <Stack.Screen name="AppTabs" component={AppTabs} />
      )}
    </Stack.Navigator>
  );
}
