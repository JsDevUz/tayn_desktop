import React, { useState, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, Alert, Snackbar, Typography } from "@mui/material";
import LoginPage from "./components/LoginPage";
import StoreSelector from "./components/StoreSelector";
import PosPage from "./components/PosPage";
import AuthService from "../services/auth";
import { syncService } from "../services/sync";
import { getTheme, getStoredSettings } from "./theme";

const SETTINGS_STORAGE_KEY = "pos_settings";

function App() {
  const [authState, setAuthState] = useState("loading"); // loading, login, store, pos
  const [currentTheme, setCurrentTheme] = useState("light");
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    // Load theme from settings
    const settings = getStoredSettings();
    setCurrentTheme(settings.theme || "light");

    // Listen for settings changes
    const handleStorageChange = () => {
      const newSettings = getStoredSettings();
      setCurrentTheme(newSettings.theme || "light");
    };

    // Listen for logout event
    const handleLogout = () => {
      setAuthState("login");
    };

    window.addEventListener("storage", handleStorageChange);

    // Custom event for same-tab settings changes
    window.addEventListener("settings-changed", handleStorageChange);
    window.addEventListener("logout", handleLogout);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("settings-changed", handleStorageChange);
      window.removeEventListener("logout", handleLogout);
    };
  }, []);

  useEffect(() => {
    const authService = new AuthService();
    const isAuthenticated = authService.loadFromStorage();

    console.log("Auth check:", {
      isAuthenticated,
      stores: authService.stores,
      selectedStoreId: localStorage.getItem("selected_store_id"),
    });

    if (isAuthenticated) {
      // Check if store is selected
      const selectedStore = authService.getSelectedStore();
      console.log("Selected store:", selectedStore);

      if (selectedStore) {
        setAuthState("pos");
        initializeSync();
      } else {
        setAuthState("store");
      }
    } else {
      setAuthState("login");
    }
  }, []);

  const initializeSync = () => {
    syncService.startBackgroundSync(60000);

    // Listen for sync events
    window.addEventListener("sync-progress", (e) => {
      setNotification({
        open: true,
        message: `Sync progress: ${e.detail.progress}%`,
        severity: "info",
      });
    });

    window.addEventListener("sync-complete", (e) => {
      setNotification({
        open: true,
        message: "Sync completed successfully",
        severity: "success",
      });
    });

    window.addEventListener("sync-error", (e) => {
      setNotification({
        open: true,
        message: `Sync error: ${e.detail}`,
        severity: "error",
      });
    });
  };

  const handleLoginSuccess = () => {
    setAuthState("store");
  };

  const handleStoreSelected = (selection) => {
    setAuthState("pos");
    initializeSync();
  };

  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const theme = getTheme(currentTheme);

  if (authState === "loading") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <Typography>Yuklanmoqda...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (authState === "login") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    );
  }

  if (authState === "store") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StoreSelector onSelectionComplete={handleStoreSelected} />
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    );
  }

  if (authState === "pos") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PosPage />
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    );
  }

  return null;
}

export default App;
