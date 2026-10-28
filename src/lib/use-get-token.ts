import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef } from "react";

/**
 * Clerk's `getToken` can change identity on every render. A hook that lists it as an effect dependency then restarts
 * its request after each response, which loops, floods the API and ends in 429. This returns a function whose
 * identity never changes and that always calls the latest `getToken`.
 */
export function useGetToken() {
  const { getToken } = useAuth();
  const latest = useRef(getToken);
  useEffect(() => {
    latest.current = getToken;
  }, [getToken]);
  return useCallback(() => latest.current(), []);
}
