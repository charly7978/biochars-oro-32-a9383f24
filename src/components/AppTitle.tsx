
import React from 'react';
import { Text, StyleSheet } from 'react-native';

const AppTitle = () => {
  return (
    <Text style={styles.title}>
      <Text style={styles.white}>Chars</Text>
      <Text style={styles.red}>Healt</Text>
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 32,
    marginLeft: -16,
  },
  white: {
    color: '#fff',
  },
  red: {
    color: '#ef4444',
  },
});

export default AppTitle;
