
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook para gestionar datos en el almacenamiento local
 */

import { useState, useEffect } from 'react';

/**
 * Hook personalizado para usar localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Estado para almacenar nuestro valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Obtener del almacenamiento local por clave
      const item = window.localStorage.getItem(key);
      // Analizar JSON almacenado o devolver valor inicial
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Si hay error, devolver valor inicial
      console.error(`Error al recuperar ${key} de localStorage:`, error);
      return initialValue;
    }
  });

  // Función para actualizar el valor en localStorage
  const setValue = (value: T) => {
    try {
      // Permitir que value sea una función para compatibilidad con useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Guardar estado
      setStoredValue(valueToStore);
      // Guardar en localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error al guardar ${key} en localStorage:`, error);
    }
  };

  // Efecto para sincronizar con otros componentes/pestañas
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === key && event.newValue) {
        setStoredValue(JSON.parse(event.newValue));
      }
    }

    // Escuchar cambios en otras pestañas
    window.addEventListener('storage', handleStorageChange);
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}
