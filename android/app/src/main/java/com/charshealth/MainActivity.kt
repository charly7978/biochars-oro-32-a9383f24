
package com.charshealth

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.view.SurfaceView
import android.hardware.camera2.CameraManager
import android.content.Context
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    
    private lateinit var cameraView: SurfaceView
    private lateinit var heartRateText: TextView
    private lateinit var hydrationText: TextView
    private lateinit var startButton: Button
    private lateinit var cameraManager: CameraManager
    
    private val CAMERA_PERMISSION_REQUEST = 100
    private val TAG = "CharsHealth"
    
    // Procesador de señal PPG
    private val signalProcessor = VitalSignsProcessor()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Inicializar vistas
        cameraView = findViewById(R.id.camera_view)
        heartRateText = findViewById(R.id.heart_rate_text)
        hydrationText = findViewById(R.id.hydration_text)
        startButton = findViewById(R.id.start_button)
        
        // Configurar el administrador de cámara
        cameraManager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
        
        // Solicitar permisos de cámara si es necesario
        if (!hasCameraPermission()) {
            requestCameraPermission()
        }
        
        // Configurar el botón de inicio
        startButton.setOnClickListener {
            if (hasCameraPermission()) {
                startMonitoring()
            } else {
                requestCameraPermission()
            }
        }
    }
    
    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    private fun requestCameraPermission() {
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.CAMERA),
            CAMERA_PERMISSION_REQUEST
        )
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "Permiso de cámara concedido")
            } else {
                Log.e(TAG, "Permiso de cámara denegado")
            }
        }
    }
    
    private fun startMonitoring() {
        // Aquí implementaremos el código para iniciar la monitorización
        // de signos vitales usando la cámara
        Log.d(TAG, "Iniciando monitorización")
    }
    
    override fun onPause() {
        super.onPause()
        // Detener la monitorización cuando la app está en pausa
    }
    
    override fun onResume() {
        super.onResume()
        // Reanudar la monitorización si estaba activa
    }
}
