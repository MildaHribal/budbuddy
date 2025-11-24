import { Preferences } from '@capacitor/preferences';

export const useNativeStorage = () => {

  const setItem = async (key: string, value: string) => {
    await Preferences.set({
      key,
      value,
    });
  };

  const getItem = async (key: string) => {
    const { value } = await Preferences.get({ key });
    return value;
  };

  const removeItem = async (key: string) => {
    await Preferences.remove({ key });
  };

  const setObject = async (key: string, value: object) => {
    await Preferences.set({
      key,
      value: JSON.stringify(value),
    });
  };

  const getObject = async <T>(key: string): Promise<T | null> => {
    const { value } = await Preferences.get({ key });
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  };

  return {
    setItem,
    getItem,
    removeItem,
    setObject,
    getObject
  };
};
