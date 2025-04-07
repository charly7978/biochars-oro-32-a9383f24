
import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from './use-mobile';
import { AdaptiveFilters } from '../modules/signal-processing/adaptive-filters';

/**
 * Configuración de optimizaciones móviles
 */
interface MobileOptimizationConfig {
  reduceAnimations: boolean;
  lowPowerMode: boolean;
  optimizeNetworkRequests: boolean;
  reduceProcessingLoad: boolean;
  useAdaptiveQuality: boolean;
}

/**
 * Hook para aplicar optimizaciones específicas para dispositivos móviles
 */
export const useMobileOptimizations = () => {
  const isMobile = useIsMobile();
  const [config, setConfig] = useState<MobileOptimizationConfig>({
    reduceAnimations: false,
    lowPowerMode: false,
    optimizeNetworkRequests: false,
    reduceProcessingLoad: false,
    useAdaptiveQuality: true,
  });
  
  // Detectar si el dispositivo tiene batería baja
  const [isBatteryLow, setIsBatteryLow] = useState<boolean>(false);
  
  // Estado para el rendimiento de la red
  const [networkQuality, setNetworkQuality] = useState<'high'|'medium'|'low'>('high');
  
  // Configurar optimizaciones basadas en el tipo de dispositivo
  useEffect(() => {
    if (isMobile) {
      // Configuración predeterminada para móviles
      setConfig({
        reduceAnimations: true,
        lowPowerMode: isBatteryLow,
        optimizeNetworkRequests: true,
        reduceProcessingLoad: true,
        useAdaptiveQuality: true,
      });
      
      // Configurar filtros adaptativos para móvil
      AdaptiveFilters.getInstance().optimizeForDevice(true);
      
      // Aplicar clases CSS para optimizaciones móviles
      document.body.classList.add('mobile-optimized');
    } else {
      // Configuración para escritorio
      setConfig({
        reduceAnimations: false,
        lowPowerMode: false,
        optimizeNetworkRequests: false,
        reduceProcessingLoad: false,
        useAdaptiveQuality: true,
      });
      
      // Configurar filtros adaptativos para escritorio
      AdaptiveFilters.getInstance().optimizeForDevice(false);
      
      // Quitar clases CSS de optimización móvil
      document.body.classList.remove('mobile-optimized');
    }
    
    // Aplicar optimizaciones a nivel de documento
    applyDocumentOptimizations();
    
  }, [isMobile, isBatteryLow]);
  
  // Detectar estado de batería si está disponible
  useEffect(() => {
    if ('getBattery' in navigator) {
      const checkBattery = async () => {
        try {
          // @ts-ignore - La API de batería no está en todos los navegadores
          const battery = await navigator.getBattery();
          
          // Actualizar estado si la batería está por debajo del 20%
          setIsBatteryLow(battery.level < 0.2 && !battery.charging);
          
          // Escuchar cambios en el nivel de batería
          battery.addEventListener('levelchange', () => {
            setIsBatteryLow(battery.level < 0.2 && !battery.charging);
          });
          
          // Escuchar cambios en el estado de carga
          battery.addEventListener('chargingchange', () => {
            setIsBatteryLow(battery.level < 0.2 && !battery.charging);
          });
        } catch (error) {
          console.error('Error accediendo a la API de batería:', error);
        }
      };
      
      checkBattery();
    }
  }, []);
  
  // Verificar calidad de la red
  useEffect(() => {
    if ('connection' in navigator) {
      // @ts-ignore - La API de conexión no está en todos los navegadores
      const connection = navigator.connection;
      
      const updateNetworkQuality = () => {
        // @ts-ignore
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === '4g') {
          setNetworkQuality('high');
        } else if (effectiveType === '3g') {
          setNetworkQuality('medium');
        } else {
          setNetworkQuality('low');
        }
      };
      
      updateNetworkQuality();
      
      // Escuchar cambios en la conexión
      // @ts-ignore
      connection.addEventListener('change', updateNetworkQuality);
      
      return () => {
        // @ts-ignore
        connection.removeEventListener('change', updateNetworkQuality);
      };
    }
  }, []);
  
  // Aplicar optimizaciones a nivel de documento
  const applyDocumentOptimizations = useCallback(() => {
    if (isMobile) {
      // Desactivar efectos CSS pesados
      document.documentElement.style.setProperty('--enable-animations', config.reduceAnimations ? '0' : '1');
      
      // Optimizar el reflow y repaint
      document.body.style.willChange = 'transform';
      document.body.style.backfaceVisibility = 'hidden';
      
      // Reducir complejidad visual si está en modo de bajo consumo
      if (config.lowPowerMode) {
        document.documentElement.style.setProperty('--enable-shadows', '0');
        document.documentElement.style.setProperty('--enable-blur', '0');
      } else {
        document.documentElement.style.setProperty('--enable-shadows', '1');
        document.documentElement.style.setProperty('--enable-blur', '1');
      }
    } else {
      // Restaurar valores predeterminados para escritorio
      document.documentElement.style.setProperty('--enable-animations', '1');
      document.documentElement.style.setProperty('--enable-shadows', '1');
      document.documentElement.style.setProperty('--enable-blur', '1');
      document.body.style.willChange = 'auto';
      document.body.style.backfaceVisibility = 'visible';
    }
  }, [isMobile, config]);
  
  // Ajustar configuración de optimización manual
  const updateOptimizationConfig = useCallback((newConfig: Partial<MobileOptimizationConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      // Aplicar optimizaciones actualizadas
      return updated;
    });
  }, []);
  
  return {
    isMobile,
    config,
    isBatteryLow,
    networkQuality,
    updateOptimizationConfig,
  };
};
