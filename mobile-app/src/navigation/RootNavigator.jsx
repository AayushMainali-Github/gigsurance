import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppTabs } from './AppTabs';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AppTabs" component={AppTabs} />
    </Stack.Navigator>
  );
}
