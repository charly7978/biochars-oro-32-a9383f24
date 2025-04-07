
package com.charshealth

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.View
import java.util.LinkedList

class SignalVisualizerView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {
    
    private val signalPath = Path()
    private val signalPaint = Paint().apply {
        color = Color.rgb(255, 87, 34) // Naranja
        style = Paint.Style.STROKE
        strokeWidth = 3f
        isAntiAlias = true
    }
    
    private val gridPaint = Paint().apply {
        color = Color.argb(50, 255, 255, 255) // Blanco transparente
        style = Paint.Style.STROKE
        strokeWidth = 1f
    }
    
    private val signalValues = LinkedList<Float>()
    private val MAX_POINTS = 150 // 5 segundos a 30fps
    
    // Valores para detectar arritmias
    private val arrhythmiaPaint = Paint().apply {
        color = Color.rgb(244, 67, 54) // Rojo
        style = Paint.Style.STROKE
        strokeWidth = 3f
        isAntiAlias = true
    }
    
    private var arrhythmiaDetected = false
    private val arrhythmiaRect = android.graphics.RectF()
    
    /**
     * Añade un nuevo valor a la visualización
     */
    fun addSignalValue(value: Float) {
        signalValues.add(value)
        
        // Mantener buffer de tamaño fijo
        while (signalValues.size > MAX_POINTS) {
            signalValues.removeFirst()
        }
        
        invalidate() // Solicitar redibujo
    }
    
    /**
     * Marcar detección de arritmia
     */
    fun setArrhythmiaDetected(detected: Boolean) {
        arrhythmiaDetected = detected
        invalidate()
    }
    
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val width = width.toFloat()
        val height = height.toFloat()
        
        // Dibujar cuadrícula
        drawGrid(canvas, width, height)
        
        // Dibujar señal si hay datos
        if (signalValues.isNotEmpty()) {
            drawSignal(canvas, width, height)
        }
        
        // Dibujar indicador de arritmia si es necesario
        if (arrhythmiaDetected) {
            drawArrhythmiaIndicator(canvas, width, height)
        }
    }
    
    private fun drawGrid(canvas: Canvas, width: Float, height: Float) {
        // Dibujar líneas horizontales
        val hLines = 5
        val vStep = height / hLines
        for (i in 0..hLines) {
            val y = i * vStep
            canvas.drawLine(0f, y, width, y, gridPaint)
        }
        
        // Dibujar líneas verticales
        val vLines = 10
        val hStep = width / vLines
        for (i in 0..vLines) {
            val x = i * hStep
            canvas.drawLine(x, 0f, x, height, gridPaint)
        }
    }
    
    private fun drawSignal(canvas: Canvas, width: Float, height: Float) {
        signalPath.reset()
        
        // Encontrar min/max para normalización
        var minVal = Float.MAX_VALUE
        var maxVal = Float.MIN_VALUE
        for (value in signalValues) {
            if (value < minVal) minVal = value
            if (value > maxVal) maxVal = value
        }
        
        // Asegurar que hay rango
        if (maxVal == minVal) {
            maxVal = minVal + 1f
        }
        
        // Dibujar la señal
        val xStep = width / MAX_POINTS
        var firstPoint = true
        var index = 0
        
        for (value in signalValues) {
            // Normalizar valor entre 0 y 1, luego escalar a altura
            val normalizedValue = (value - minVal) / (maxVal - minVal)
            val y = height - (normalizedValue * height * 0.8f + height * 0.1f)
            val x = index * xStep
            
            if (firstPoint) {
                signalPath.moveTo(x, y)
                firstPoint = false
            } else {
                signalPath.lineTo(x, y)
            }
            
            index++
        }
        
        canvas.drawPath(signalPath, signalPaint)
    }
    
    private fun drawArrhythmiaIndicator(canvas: Canvas, width: Float, height: Float) {
        // Dibujar un rectángulo parpadeante en el borde
        val now = System.currentTimeMillis()
        val alpha = (127 + 128 * Math.sin(now / 300.0)).toInt()
        
        arrhythmiaPaint.alpha = alpha
        arrhythmiaRect.set(0f, 0f, width, height)
        canvas.drawRect(arrhythmiaRect, arrhythmiaPaint)
        
        // Forzar redibujado continuo mientras haya arritmia
        invalidate()
    }
}
