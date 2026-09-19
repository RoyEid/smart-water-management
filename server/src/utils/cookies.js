export function getCookieOptions(rememberMe = false) {
  const isProduction = process.env.NODE_ENV === "production";
  
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    path: "/",
  };

  if (rememberMe) {
    const days = parseInt(process.env.COOKIE_EXPIRES_DAYS || "7", 10);
    options.maxAge = days * 24 * 60 * 60 * 1000;
  }

  return options;
}

export function setAuthCookie(res, token, rememberMe = false) {
  const options = getCookieOptions(rememberMe);
  res.cookie("auth_token", token, options);
}

export function clearAuthCookie(res) {
  const options = getCookieOptions(false);
  const clearOptions = { ...options };
  delete clearOptions.maxAge;
  res.clearCookie("auth_token", clearOptions);
}
