import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Button, Modal, TextInput } from 'react-native';
import CameraView from './components/CameraView';
import HeartRateDisplay from './components/HeartRateDisplay';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [bp, setBp] = useState<{ sys: number, dia: number } | null>(null);
  const [arrhythmia, setArrhythmia] = useState<boolean>(false);
  const [ppgSignal, setPpgSignal] = useState<number[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualSys, setManualSys] = useState('');
  const [manualDia, setManualDia] = useState('');

  const applyCalibration = () => {
    const sys = parseInt(manualSys);
    const dia = parseInt(manualDia);
    if (!isNaN(sys) && !isNaN(dia)) {
      setBp({ sys, dia });
    }
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Text style={styles.title}>Medición Biométrica</Text>

      <CameraView 
        onHeartRateChange={setHeartRate}
        onSpo2Change={setSpo2}
        onBpChange={setBp}
        onArrhythmiaDetected={setArrhythmia}
        onSignalUpdate={setPpgSignal}
      />

      <HeartRateDisplay 
        heartRate={heartRate} 
        spo2={spo2} 
        bp={bp} 
        arrhythmia={arrhythmia} 
        signal={ppgSignal}
      />

      <View style={styles.buttonContainer}>
        <Button title="Calibrar presión" onPress={() => setModalVisible(true)} />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Calibrar presión arterial</Text>
            <TextInput
              style={styles.input}
              placeholder="Sistólica (mmHg)"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={manualSys}
              onChangeText={setManualSys}
            />
            <TextInput
              style={styles.input}
              placeholder="Diastólica (mmHg)"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={manualDia}
              onChangeText={setManualDia}
            />
            <Button title="Guardar y cerrar" onPress={applyCalibration} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    textAlign: 'center',
  },
});
