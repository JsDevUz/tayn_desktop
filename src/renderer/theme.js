import { createTheme } from '@mui/material/styles';

// Discord-like dark theme colors
const discordDark = {
  background: {
    default: '#36393f',
    paper: '#2f3136',
    secondary: '#202225',
    tertiary: '#40444b'
  },
  text: {
    primary: '#dcddde',
    secondary: '#b9bbbe',
    disabled: '#72767d'
  },
  divider: '#40444b',
  primary: '#5865f2',
  success: '#43b581',
  warning: '#faa61a',
  error: '#ed4245'
};

// Light theme (current colors)
const lightPalette = {
  mode: 'light',
  primary: {
    main: '#5c6bc0',
    light: '#8e99a4',
    dark: '#3949ab',
    contrastText: '#fff'
  },
  secondary: {
    main: '#ff6b35',
    light: '#ff9a61',
    dark: '#c53a00',
    contrastText: '#fff'
  },
  success: {
    main: '#4caf50',
    light: '#80e27e',
    dark: '#087f23'
  },
  error: {
    main: '#f44336',
    light: '#ff7961',
    dark: '#ba000d'
  },
  warning: {
    main: '#ff9800',
    light: '#ffc947',
    dark: '#c66900'
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff'
  },
  text: {
    primary: '#1a1a2e',
    secondary: 'rgba(0, 0, 0, 0.6)'
  },
  divider: 'rgba(0, 0, 0, 0.12)'
};

// Dark theme (Discord-like)
const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#5865f2',
    light: '#7983f5',
    dark: '#4752c4',
    contrastText: '#fff'
  },
  secondary: {
    main: '#ff6b35',
    light: '#ff9a61',
    dark: '#c53a00',
    contrastText: '#fff'
  },
  success: {
    main: '#43b581',
    light: '#6bc99a',
    dark: '#2d7d57'
  },
  error: {
    main: '#ed4245',
    light: '#f16c6e',
    dark: '#c03537'
  },
  warning: {
    main: '#faa61a',
    light: '#fbb848',
    dark: '#c78513'
  },
  background: {
    default: discordDark.background.default,
    paper: discordDark.background.paper
  },
  text: {
    primary: discordDark.text.primary,
    secondary: discordDark.text.secondary,
    disabled: discordDark.text.disabled
  },
  divider: discordDark.divider,
  action: {
    active: '#dcddde',
    hover: 'rgba(79, 84, 92, 0.4)',
    selected: 'rgba(79, 84, 92, 0.6)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)'
  }
};

// Common theme settings
const commonSettings = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { 
      textTransform: 'none',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 16px'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10
        }
      }
    }
  }
};

// Create light theme
export const lightTheme = createTheme({
  palette: lightPalette,
  ...commonSettings
});

// Create dark theme
export const darkTheme = createTheme({
  palette: darkPalette,
  ...commonSettings,
  components: {
    ...commonSettings.components,
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: discordDark.background.paper
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: discordDark.background.secondary
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          backgroundColor: discordDark.background.default
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: discordDark.background.paper
        }
      }
    }
  }
});

// Get theme by name
export const getTheme = (themeName) => {
  return themeName === 'dark' ? darkTheme : lightTheme;
};

// Get settings from localStorage
export const getStoredSettings = () => {
  try {
    const saved = localStorage.getItem('pos_settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error getting stored settings:', error);
  }
  return { language: 'uz', theme: 'light' };
};
