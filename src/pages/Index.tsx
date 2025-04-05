import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppTitle from '../components/AppTitle';

const Index = () => {
  return (
    <SafeAreaView style={styles.container}>
      <AppTitle />
      <View style={styles.content}>
        <Text style={styles.text}>Welcome to the Mobile App</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
});

export default Index;