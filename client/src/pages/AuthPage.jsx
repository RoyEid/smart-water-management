import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const isRegister = location.pathname === "/register";

  function showLogin() {
    navigate("/login");
  }

  function showRegister() {
    navigate("/register");
  }

  return (
    <AuthLayout
      isRegister={isRegister}
      loginForm={
        <LoginPage
          key={location.pathname}
          onRegister={showRegister}
        />
      }
      // Keyed on the pathname like the login form, so moving between the two
      // screens remounts the form and clears any typed password.
      registerForm={<RegisterPage key={location.pathname} onLogin={showLogin} />}
    />
  );
}

export default AuthPage;
