'use client';

import { createContext, useContext, useMemo, useState, useTransition } from 'react';
import { setSavedItem } from '@/app/saved/actions';
import { savedItemKey, type SavedKind } from '@/lib/basic/saved';

export type BasicSaveState = {
  signedIn: boolean;
  active: boolean;
  savedKeys: string[];
};

type BasicSaveContextValue = BasicSaveState & {
  pendingKey: string | null;
  toggle: (kind: SavedKind, targetId: string, saved: boolean) => Promise<string | null>;
};

const BasicSaveContext = createContext<BasicSaveContextValue | null>(null);

export function BasicSaveProvider({
  state,
  children,
}: {
  state: BasicSaveState;
  children: React.ReactNode;
}) {
  const [savedKeys, setSavedKeys] = useState(state.savedKeys);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const serialized = state.savedKeys.join('|');
  const [snapshot, setSnapshot] = useState(serialized);
  if (snapshot !== serialized) {
    setSnapshot(serialized);
    setSavedKeys(serialized ? serialized.split('|') : []);
  }

  const value = useMemo<BasicSaveContextValue>(
    () => ({
      signedIn: state.signedIn,
      active: state.active,
      savedKeys,
      pendingKey,
      toggle: async (kind, targetId, saved) => {
        const key = savedItemKey(kind, targetId);
        setPendingKey(key);
        let message: string | null = null;
        setSavedKeys((current) =>
          saved ? Array.from(new Set([...current, key])) : current.filter((item) => item !== key)
        );
        const result = await setSavedItem({ kind, targetId, saved });
        if (!result.ok) {
          message = result.message;
          setSavedKeys((current) =>
            saved ? current.filter((item) => item !== key) : Array.from(new Set([...current, key]))
          );
        }
        startTransition(() => setPendingKey(null));
        return message;
      },
    }),
    [pendingKey, savedKeys, state.active, state.signedIn]
  );

  return <BasicSaveContext.Provider value={value}>{children}</BasicSaveContext.Provider>;
}

export function useBasicSave(): BasicSaveContextValue | null {
  return useContext(BasicSaveContext);
}
