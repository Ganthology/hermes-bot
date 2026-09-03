import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '../../src/theme';

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={colors.accent} minimizeBehavior="never">
      <NativeTabs.Trigger name="agents">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.2', selected: 'person.2.fill' }}
          md="group"
        />
        <NativeTabs.Trigger.Label>Agents</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gear', selected: 'gearshape.fill' }}
          md="settings"
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
