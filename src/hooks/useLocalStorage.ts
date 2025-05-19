import { useState, useEffect, useCallback } from 'react';

function getValue<T>(key: string, initialValue: T | (() => T)): T {
  if (typeof window === 'undefined') {
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  }
  const saved = window.localStorage.getItem(key);
  if (saved !== null && saved !== "undefined") { // Add check for "undefined" string
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("Error parsing localStorage value for key:", key, error);
      // Fallback to initialValue if parsing fails
    }
  }
  return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
}

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => getValue(key, initialValue));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error("Error setting localStorage value for key:", key, error);
      }
    }
  }, [key, value]);

  const setStoredValue = useCallback((newValue: React.SetStateAction<T>) => {
    setValue(prevValue => {
      const result = typeof newValue === 'function'
        ? (newValue as (prevState: T) => T)(prevValue)
        : newValue;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(key, JSON.stringify(result));
        } catch (error) {
          console.error("Error setting localStorage value in callback for key:", key, error);
        }
      }
      return result;
    });
  }, [key]);


  return [value, setStoredValue];
}
