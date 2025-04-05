
import React, { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
  centerContent?: boolean;
  adaptForKeyboard?: boolean;
}

/**
 * Contenedor responsivo mejorado que se adapta automáticamente a dispositivos móviles
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = "",
  fullHeight = true,
  centerContent = true,
  adaptForKeyboard = true,
}) => {
  const isMobile = useIsMobile();
  const { config } = useMobileOptimizations();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);
  
  // Detectar cambios en la altura de la ventana para adaptarse al teclado
  useEffect(() => {
    if (!isMobile || !adaptForKeyboard) return;
    
    const handleResize = () => {
      const newHeight = window.innerHeight;
      // Si la altura disminuye significativamente, probablemente es el teclado
      const heightDifference = viewportHeight - newHeight;
      const keyboardThreshold = viewportHeight * 0.15; // 15% del alto
      
      setViewportHeight(newHeight);
      
      if (heightDifference > keyboardThreshold) {
        setKeyboardOpen(true);
      } else {
        setKeyboardOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Configurar altura inicial
    setViewportHeight(window.innerHeight);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile, adaptForKeyboard, viewportHeight]);
  
  // Prevenir el desplazamiento y zoom en móviles
  useEffect(() => {
    if (!isMobile) return;
    
    // Configurar viewport meta
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    } else {
      // Crear si no existe
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
      document.head.appendChild(meta);
    }
    
    // Prevenir eventos táctiles que pueden causar zoom
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchstart', preventZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', preventZoom);
    };
  }, [isMobile]);
  
  // Estilos base
  const containerClasses = [
    "responsive-container",
    fullHeight ? "min-h-screen" : "",
    centerContent ? "flex flex-col items-center justify-center" : "",
    keyboardOpen ? "keyboard-open" : "",
    isMobile ? "mobile-view" : "desktop-view",
    config.lowPowerMode ? "low-power-mode" : "",
    className
  ].filter(Boolean).join(" ");
  
  // Establecer estilos de rendimiento para optimizar
  const containerStyle: React.CSSProperties = {
    // Optimizaciones para rendimiento
    willChange: isMobile ? 'transform' : 'auto',
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    // Ajuste para cuando el teclado está abierto
    paddingBottom: keyboardOpen ? '40vh' : undefined,
    overflowY: keyboardOpen ? 'auto' : undefined,
    // Altura específica para pantalla completa en móvil
    height: isMobile && fullHeight ? `${viewportHeight}px` : undefined
  };
  
  return (
    <div className={containerClasses} style={containerStyle}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;
