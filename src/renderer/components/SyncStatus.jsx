import React from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import { Wifi, WifiOff, Sync, CheckCircle } from '@mui/icons-material';

const SyncStatus = ({ status }) => {
  const { isOnline, syncInProgress, lastSyncTime } = status;

  const formatLastSync = (date) => {
    if (!date) return 'Hech qachon sinxronizatsiya qilinmagan';
    return new Date(date).toLocaleString('uz-UZ');
  };

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="div">
            TAYN POS Desktop
          </Typography>
          
          <Chip
            icon={isOnline ? <Wifi /> : <WifiOff />}
            label={isOnline ? 'Online' : 'Offline'}
            color={isOnline ? 'success' : 'default'}
            size="small"
          />
          
          {syncInProgress && (
            <Chip
              icon={<Sync />}
              label="Sinxronizatsiya..."
              color="primary"
              size="small"
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {lastSyncTime && !syncInProgress && (
            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
          )}
          <Typography variant="caption" color="text.secondary">
            Oxirgi sinxronizatsiya: {formatLastSync(lastSyncTime)}
          </Typography>
        </Box>
      </Box>

      {syncInProgress && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  );
};

export default SyncStatus;
