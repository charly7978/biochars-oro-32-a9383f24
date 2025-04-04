
/**
 * Sistema de prevención y manejo defensivo de errores
 * Implementa estrategias proactivas para evitar y gestionar errores
 */
import { logError, ErrorLevel } from './debugUtils';

interface Issue {
  id: string;
  description: string;
  createdAt: number;
  acknowledged: boolean;
}

// Registro de problemas conocidos
const knownIssues: Issue[] = [];

/**
 * Inicializa el sistema de prevención de errores
 */
export function initializeErrorPreventionSystem(): () => void {
  console.log('Error prevention system initialized');
  
  // Interceptar errores de red
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch(...args);
      return response;
    } catch (error) {
      // Registrar error de red
      logError(
        `Network error during fetch to ${args[0]}: ${error}`, 
        ErrorLevel.ERROR, 
        'NetworkInterceptor',
        { url: args[0], error }
      );
      throw error;
    }
  };
  
  // Prevenir errores de DOM
  preventDOMExceptions();
  
  return function cleanup() {
    // Restaurar fetch original
    window.fetch = originalFetch;
    console.log('Error prevention system cleaned up');
  };
}

/**
 * Previene excepciones comunes del DOM
 */
function preventDOMExceptions(): void {
  // Interceptar errores de acceso a propiedades de elementos DOM no existentes
  const originalGetElementById = document.getElementById;
  document.getElementById = function(id: string) {
    const element = originalGetElementById.call(document, id);
    if (!element && id) {
      logError(
        `Attempted to access non-existent DOM element with ID: ${id}`,
        ErrorLevel.WARNING,
        'DOMPreventionSystem'
      );
    }
    return element;
  };
}

/**
 * Registra un nuevo problema conocido
 */
export function registerIssue(description: string): string {
  const id = `issue-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const issue: Issue = {
    id,
    description,
    createdAt: Date.now(),
    acknowledged: false
  };
  
  knownIssues.push(issue);
  logError(`New issue registered: ${description}`, ErrorLevel.WARNING, 'IssueTracker', { issueId: id });
  
  return id;
}

/**
 * Marca un problema como reconocido
 */
export function acknowledgeIssue(id: string): boolean {
  const issue = knownIssues.find(i => i.id === id);
  if (issue) {
    issue.acknowledged = true;
    logError(`Issue acknowledged: ${issue.description}`, ErrorLevel.INFO, 'IssueTracker', { issueId: id });
    return true;
  }
  return false;
}

/**
 * Obtiene todos los problemas conocidos
 */
export function getKnownIssues(): Issue[] {
  return [...knownIssues];
}

/**
 * Wrapper para ejecución segura de funciones
 */
export function safeExecute<T>(
  fn: () => T, 
  fallback: T, 
  errorContext: string = 'unknown'
): T {
  try {
    return fn();
  } catch (error) {
    logError(
      `Error in safeExecute (${errorContext}): ${error}`,
      ErrorLevel.ERROR,
      'SafeExecuteWrapper',
      { error }
    );
    return fallback;
  }
}
