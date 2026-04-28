import { trpc } from "@/lib/trpc";
import { auth, signInWithGoogle, signOut } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

export function useAuth() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: firebaseReady,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseReady(true);
      if (firebaseUser) {
        await utils.auth.me.invalidate();
      } else {
        utils.auth.me.setData(undefined, null);
      }
    });
    return unsubscribe;
  }, [utils]);

  const logout = async () => {
    await signOut();
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  };

  return {
    user: meQuery.data ?? null,
    loading: !firebaseReady || meQuery.isLoading,
    error: meQuery.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
    login: signInWithGoogle,
    logout,
    refresh: () => meQuery.refetch(),
  };
}
