import { useEffect, useState } from 'react';

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  if (window.localStorage) {
    const [value, setValue] = useState(
      JSON.parse(window.localStorage.getItem(key) || JSON.stringify(initialValue))
    );
    useEffect(
      () => window.localStorage.setItem(key, JSON.stringify(value)),
      [value],
    );
    return [value, setValue];
  } else {
    return useState(initialValue);
  }
};
