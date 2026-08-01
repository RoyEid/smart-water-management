import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "../utils/apiError";

/**
 * The fetch-render-error cycle every list and detail page needs, in one place.
 *
 * Two things it gets right that ten hand-rolled copies would not:
 *
 * 1. Stale responses are discarded. Each run takes a token; a response whose
 *    token is no longer current (the user paged again, or changed a filter) is
 *    dropped instead of overwriting newer data.
 * 2. State is only written after the request settles. Nothing is set
 *    synchronously while the effect runs, so a fetch cannot cascade an extra
 *    render pass before it has any result to show.
 *
 * The previous data stays visible while a refetch is in flight, so paginating
 * does not blank the table — `isRefreshing` is there if a page wants to show a
 * subtle busy indicator instead.
 */
export default function useAsyncData(fetcher, deps = [], { fallbackMessage } = {}) {
  const [state, setState] = useState({
    data: null,
    // True until the first request settles, so a page can distinguish "still
    // loading" from "loaded, and genuinely empty".
    isLoading: true,
    isRefreshing: false,
    error: "",
  });

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);

  // Kept in a ref so a caller can pass an inline arrow function without the
  // effect re-running on every render.
  fetcherRef.current = fetcher;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setState({ data: result, isLoading: false, isRefreshing: false, error: "" });
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setState((current) => ({
        ...current,
        isLoading: false,
        isRefreshing: false,
        error: getApiErrorMessage(error, fallbackMessage),
      }));
    }
  }, [fallbackMessage]);

  useEffect(() => {
    run();
    // The dependency list is supplied by the caller: it is the set of filters
    // and page numbers that should trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  /**
   * Manual retry. Safe to set state synchronously here because it is called
   * from an event handler, not during an effect.
   */
  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: "" }));
    run();
  }, [run]);

  const refresh = useCallback(() => {
    setState((current) => ({ ...current, isRefreshing: true }));
    run();
  }, [run]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    error: state.error,
    retry,
    refresh,
  };
}
