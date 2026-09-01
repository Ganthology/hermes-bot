import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useGateway } from '../src/state/GatewayProvider';
import { colors } from '../src/theme';

export default function Index() {
  const { ready, credentials } = useGateway();

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!credentials) {
    return <Redirect href="/connect" />;
  }

  return <Redirect href="/agents" />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
