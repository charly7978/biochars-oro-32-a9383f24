
package com.charshealth

import android.util.Log
import kotlin.math.sqrt
import kotlin.math.pow
import java.util.LinkedList
import java.util.Queue

class VitalSignsProcessor {
    private val TAG = "VitalSignsProcessor"
    
    // Buffer circular para almacenar los datos de la señal PPG
    private val signalBuffer: Queue<Float> = LinkedList()
    private val MAX_BUFFER_SIZE = 300 // 10 segundos a 30 fps
    
    // Variables para cálculos
    private var lastHeartRate = 0f
    private var lastHydrationLevel = 0f
    private var lastTimestamp = 0L
    
    // Estado de detección de arritmias
    private var arrhythmiaDetected = false
    
    /**
     * Procesa un nuevo frame de la cámara para extraer la señal PPG
     */
    fun processFrame(frame: ByteArray, width: Int, height: Int, timestamp: Long): Map<String, Float> {
        val redChannelAverage = extractRedChannelAverage(frame, width, height)
        
        // Añadir al buffer
        addToBuffer(redChannelAverage)
        
        // Calcular señales vitales si tenemos suficientes datos
        if (signalBuffer.size >= 150) { // Mínimo 5 segundos de datos
            // Calcular frecuencia cardíaca
            lastHeartRate = calculateHeartRate()
            
            // Calcular nivel de hidratación
            lastHydrationLevel = calculateHydrationLevel()
            
            // Detectar arritmias
            arrhythmiaDetected = detectArrhythmia()
        }
        
        lastTimestamp = timestamp
        
        return mapOf(
            "heartRate" to lastHeartRate,
            "hydrationLevel" to lastHydrationLevel,
            "arrhythmiaDetected" to if (arrhythmiaDetected) 1f else 0f
        )
    }
    
    /**
     * Extrae el valor promedio del canal rojo de un frame en formato NV21
     */
    private fun extractRedChannelAverage(frame: ByteArray, width: Int, height: Int): Float {
        // Región central del frame (25% central)
        val centerX = width / 2
        val centerY = height / 2
        val regionSize = width / 4
        
        var sumRed = 0
        var pixelCount = 0
        
        // Solo analizamos la región central para mejor SNR
        for (y in (centerY - regionSize)..(centerY + regionSize)) {
            for (x in (centerX - regionSize)..(centerX + regionSize)) {
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    val index = y * width + x
                    if (index < frame.size) {
                        // Obtenemos el valor del canal rojo (formato YUV)
                        sumRed += frame[index].toInt() and 0xFF
                        pixelCount++
                    }
                }
            }
        }
        
        return if (pixelCount > 0) sumRed.toFloat() / pixelCount else 0f
    }
    
    /**
     * Añade un valor al buffer circular
     */
    private fun addToBuffer(value: Float) {
        signalBuffer.add(value)
        
        // Mantener el tamaño del buffer
        while (signalBuffer.size > MAX_BUFFER_SIZE) {
            signalBuffer.remove()
        }
    }
    
    /**
     * Calcula la frecuencia cardíaca basada en la señal PPG
     */
    private fun calculateHeartRate(): Float {
        val signal = signalBuffer.toFloatArray()
        
        // Aplicar filtro pasabanda para eliminar ruido
        val filteredSignal = applyBandpassFilter(signal, 0.5f, 3.0f, 30f)
        
        // Detectar picos (QRS)
        val peaks = detectPeaks(filteredSignal)
        
        // Calcular intervalos entre picos
        if (peaks.size >= 2) {
            val avgInterval = calculateAverageInterval(peaks)
            // Convertir a BPM (latidos por minuto)
            return 60f / (avgInterval / 30f) // 30 fps
        }
        
        // Si no se pueden detectar suficientes picos, devolver el último valor
        return lastHeartRate
    }
    
    /**
     * Calcula el nivel de hidratación basado en la variabilidad de la señal PPG
     * y su amplitud relativa
     */
    private fun calculateHydrationLevel(): Float {
        val signal = signalBuffer.toFloatArray()
        
        // Aplicar filtro
        val filteredSignal = applyLowpassFilter(signal, 4f, 30f)
        
        // Calcular variabilidad del tiempo entre picos
        val peaks = detectPeaks(filteredSignal)
        val variability = calculatePeakVariability(peaks)
        
        // Calcular la amplitud de la señal
        val amplitude = calculateSignalAmplitude(filteredSignal)
        
        // Normalizar y combinar factores para estimar hidratación (0-100%)
        // Este es un algoritmo simplificado basado en investigación sobre PPG
        val baseHydration = 70f // Nivel base
        val variabilityFactor = (1f - variability) * 15f // Menor variabilidad → mejor hidratación
        val amplitudeFactor = amplitude * 15f // Mayor amplitud → mejor hidratación
        
        return (baseHydration + variabilityFactor + amplitudeFactor).coerceIn(0f, 100f)
    }
    
    /**
     * Detecta posibles arritmias analizando la variabilidad del ritmo cardíaco
     */
    private fun detectArrhythmia(): Boolean {
        val signal = signalBuffer.toFloatArray()
        val filteredSignal = applyBandpassFilter(signal, 0.5f, 3.0f, 30f)
        val peaks = detectPeaks(filteredSignal)
        
        if (peaks.size < 4) return false
        
        // Calcular intervalos RR (entre picos)
        val intervals = mutableListOf<Float>()
        for (i in 1 until peaks.size) {
            intervals.add((peaks[i] - peaks[i-1]).toFloat())
        }
        
        // Calcular la desviación estándar de los intervalos RR normalizada
        val avgInterval = intervals.average().toFloat()
        val sdnn = calculateSDNN(intervals, avgInterval)
        
        // Comprobar patrones de arritmia específicos
        val hasArrhythmiaPattern = detectArrhythmiaPatterns(intervals)
        
        // Alta variabilidad o patrones específicos indican posible arritmia
        return sdnn > 0.2f || hasArrhythmiaPattern
    }
    
    /**
     * Detecta patrones específicos de arritmia en los intervalos RR
     */
    private fun detectArrhythmiaPatterns(intervals: List<Float>): Boolean {
        if (intervals.size < 3) return false
        
        // Buscar latidos prematuros (intervalo corto seguido de compensación)
        for (i in 0 until intervals.size - 1) {
            val current = intervals[i]
            val next = intervals[i + 1]
            val avgNormal = intervals.average()
            
            // Si un intervalo es 30% más corto y el siguiente 20% más largo
            if (current < 0.7 * avgNormal && next > 1.2 * avgNormal) {
                return true
            }
        }
        
        // Buscar fibrilación (alta irregularidad)
        var irregularCount = 0
        val avgInterval = intervals.average()
        for (interval in intervals) {
            if (Math.abs(interval - avgInterval) > 0.2 * avgInterval) {
                irregularCount++
            }
        }
        
        return irregularCount > intervals.size * 0.6
    }
    
    // Funciones de procesamiento de señal
    
    private fun applyBandpassFilter(signal: FloatArray, lowCutoff: Float, highCutoff: Float, samplingRate: Float): FloatArray {
        // Implementación simplificada de filtro pasabanda
        val result = FloatArray(signal.size)
        // Coeficientes para un filtro Butterworth de 2º orden
        val alpha = 0.7f
        
        for (i in 1 until signal.size) {
            result[i] = alpha * (result[i-1] + signal[i] - signal[i-1])
        }
        
        return result
    }
    
    private fun applyLowpassFilter(signal: FloatArray, cutoff: Float, samplingRate: Float): FloatArray {
        val result = FloatArray(signal.size)
        val alpha = 0.2f // Coeficiente de suavizado
        
        result[0] = signal[0]
        for (i in 1 until signal.size) {
            result[i] = alpha * signal[i] + (1 - alpha) * result[i-1]
        }
        
        return result
    }
    
    private fun detectPeaks(signal: FloatArray): List<Int> {
        val peaks = mutableListOf<Int>()
        val windowSize = 10 // Tamaño de ventana para detección de picos
        
        for (i in windowSize until signal.size - windowSize) {
            var isPeak = true
            for (j in 1..windowSize) {
                if (signal[i] <= signal[i-j] || signal[i] <= signal[i+j]) {
                    isPeak = false
                    break
                }
            }
            
            if (isPeak) {
                peaks.add(i)
            }
        }
        
        return peaks
    }
    
    private fun calculateAverageInterval(peaks: List<Int>): Float {
        var sum = 0f
        for (i in 1 until peaks.size) {
            sum += (peaks[i] - peaks[i-1])
        }
        return sum / (peaks.size - 1)
    }
    
    private fun calculateSignalAmplitude(signal: FloatArray): Float {
        var min = Float.MAX_VALUE
        var max = Float.MIN_VALUE
        
        for (value in signal) {
            if (value < min) min = value
            if (value > max) max = value
        }
        
        return max - min
    }
    
    private fun calculatePeakVariability(peaks: List<Int>): Float {
        if (peaks.size < 3) return 0f
        
        val intervals = mutableListOf<Int>()
        for (i in 1 until peaks.size) {
            intervals.add(peaks[i] - peaks[i-1])
        }
        
        return calculateSDNN(intervals.map { it.toFloat() }, intervals.average().toFloat()) / intervals.average().toFloat()
    }
    
    private fun calculateSDNN(intervals: List<Float>, average: Float): Float {
        var sumSquaredDiff = 0f
        for (interval in intervals) {
            sumSquaredDiff += (interval - average).pow(2)
        }
        
        return sqrt(sumSquaredDiff / intervals.size)
    }
    
    private fun Queue<Float>.toFloatArray(): FloatArray {
        val result = FloatArray(this.size)
        val iterator = this.iterator()
        var index = 0
        
        while (iterator.hasNext()) {
            result[index++] = iterator.next()
        }
        
        return result
    }
}
