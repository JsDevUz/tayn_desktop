import { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Dialog, 
  IconButton, 
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Divider,
  Switch,
  Button
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LanguageIcon from "@mui/icons-material/Language";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";

const SETTINGS_STORAGE_KEY = 'pos_settings';

const LANGUAGES = [
  { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
];

const THEMES = [
  { code: 'light', name: 'Yorug\'', icon: LightModeIcon },
  { code: 'dark', name: 'Qorong\'i', icon: DarkModeIcon }
];

const defaultSettings = {
  language: 'uz',
  theme: 'light'
};

export default function SettingsModal({ open, onClose, onSettingsChange }) {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = (newSettings) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // Dispatch custom event for App.jsx to listen
      window.dispatchEvent(new CustomEvent('settings-changed', { detail: newSettings }));
      
      if (onSettingsChange) {
        onSettingsChange(newSettings);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleLanguageChange = (code) => {
    saveSettings({ ...settings, language: code });
  };

  const handleThemeChange = (code) => {
    saveSettings({ ...settings, theme: code });
  };

  const handleLogout = () => {
    // Clear auth data (must match keys used by AuthService)
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    localStorage.removeItem('warehouses');
    localStorage.removeItem('stores');
    localStorage.removeItem('permissions');
    localStorage.removeItem('selected_warehouse_id');
    localStorage.removeItem('selected_store_id');
    localStorage.removeItem('pos_tabs_state');
    
    // Dispatch logout event for App.jsx to handle
    window.dispatchEvent(new CustomEvent('logout'));
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          maxHeight: '85vh',
          bgcolor: 'background.default'
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
            Sozlamalar
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Language Selection */}
        <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <LanguageIcon sx={{ color: '#5c6bc0' }} />
            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>
              Til tanlang
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {LANGUAGES.map((lang) => (
              <Box
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: settings.language === lang.code ? '#5c6bc0' : 'transparent',
                  bgcolor: settings.language === lang.code ? '#ede7f6' : '#fafafa',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: settings.language === lang.code ? '#ede7f6' : '#f0f0f0'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontSize: 24 }}>{lang.flag}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                    {lang.name}
                  </Typography>
                </Box>
                <Radio 
                  checked={settings.language === lang.code}
                  sx={{ 
                    color: '#5c6bc0',
                    '&.Mui-checked': { color: '#5c6bc0' }
                  }}
                />
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Theme Selection */}
        <Paper sx={{ p: 2.5, borderRadius: '16px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <DarkModeIcon sx={{ color: '#5c6bc0' }} />
            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>
              Mavzu (Theme)
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {THEMES.map((theme) => {
              const Icon = theme.icon;
              return (
                <Box
                  key={theme.code}
                  onClick={() => handleThemeChange(theme.code)}
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: settings.theme === theme.code ? '#5c6bc0' : 'transparent',
                    bgcolor: settings.theme === theme.code 
                      ? (theme.code === 'dark' ? '#1a1a2e' : '#ede7f6')
                      : (theme.code === 'dark' ? '#2d2d3d' : '#fafafa'),
                    color: theme.code === 'dark' ? '#fff' : 'inherit',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#5c6bc0'
                    }
                  }}
                >
                  <Icon sx={{ 
                    fontSize: 36, 
                    mb: 1,
                    color: settings.theme === theme.code 
                      ? (theme.code === 'dark' ? '#ffc107' : '#5c6bc0')
                      : (theme.code === 'dark' ? '#fff' : '#666')
                  }} />
                  <Typography sx={{ 
                    fontSize: 13, 
                    fontWeight: 600,
                    color: theme.code === 'dark' ? '#fff' : 'inherit'
                  }}>
                    {theme.name}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>

        {/* Logout Section */}
        <Paper sx={{ p: 2.5, borderRadius: '16px', mt: 2, bgcolor: '#ffebee' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LogoutIcon sx={{ color: '#ef5350' }} />
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#c62828' }}>
                Chiqish
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={handleLogout}
              sx={{
                bgcolor: '#ef5350',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#d32f2f' }
              }}
            >
              Logout
            </Button>
          </Box>
        </Paper>

        {/* Info */}
        <Typography sx={{ 
          mt: 2, 
          fontSize: 12, 
          color: 'text.secondary',
          textAlign: 'center'
        }}>
          Sozlamalar avtomatik saqlanadi
        </Typography>
      </Box>
    </Dialog>
  );
}
