import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "../services/api";
import sensorSocket from "../services/socket";
import { getApiErrorMessage, isUnauthorized } from "../utils/apiError";
import { AuthContext } from "./AuthContext";

/**
 * Single owner of "who is signed in".
 *
 * Every page previously called /auth/me for itself, which meant one request per
 * page and no shared answer about the user's role. Loading it once here also
 * lets the route guards wait for a definitive answer instead of briefly
 * rendering the login page for a user who is in fact signed in.
 */
export function AuthProvider({ children }) {
  // One state object rather than three: the three values always change
  // together, and splitting them allowed a render where the user was set but
  // the status still said "loading".
  const [session, setSession] = useState({
    user: null,
    // "loading" until the first /auth/me resolves. Guards must not act on the
    // absence of a user before that, or a refresh would bounce to /login.
    status: "loading", // loading | authenticated | anonymous
    error: "",
  });
  const { user, status, error } = session;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Resolves the session.
   *
   * State is written once, after the request settles — never while the effect
   * that triggers it is still running — so a sign-in check cannot cascade an
   * extra render before it has an answer.
   */
  const loadUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      if (!mountedRef.current) return null;
      setSession({ user: data.user, status: "authenticated", error: "" });
      return data.user;
    } catch (requestError) {
      if (!mountedRef.current) return null;
      setSession({
        user: null,
        status: "anonymous",
        // 401 is the expected answer for a signed-out visitor, not something to
        // show. Anything else (server down, disabled account) is real and worth
        // surfacing on the login screen.
        error: isUnauthorized(requestError)
          ? ""
          : getApiErrorMessage(requestError, "Unable to verify your session."),
      });
      return null;
    }
  }, []);

  useEffect(() => {
    // react-hooks/set-state-in-effect flags any call it can trace to a
    // setState, without accounting for `await`. loadUser only writes state
    // after the /auth/me request resolves — in a microtask, not synchronously
    // during this effect — so the cascading render the rule warns about cannot
    // happen here. Fetching on mount is the documented use of an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    try {
      sensorSocket.disconnect();
      await api.post("/auth/logout");
    } catch {
      // The cookie is httpOnly, so the client cannot clear it itself. If the
      // request failed the session may still be live server-side; local state
      // is cleared regardless so the UI never claims to be signed in after the
      // user asked to leave.
    } finally {
      if (mountedRef.current) {
        setSession({ user: null, status: "anonymous", error: "" });
      }
    }
  }, []);

  // Lets a page that just changed the profile push the fresh user into context
  // without a second network round-trip.
  const applyUser = useCallback((updated) => {
    if (!updated) return;
    setSession((previous) => ({
      ...previous,
      user: { ...previous.user, ...updated },
    }));
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      isLoading: status === "loading",
      isAuthenticated: status === "authenticated",
      isAdmin: user?.role === "admin",
      refreshUser: loadUser,
      applyUser,
      logout,
    }),
    [user, status, error, loadUser, applyUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
