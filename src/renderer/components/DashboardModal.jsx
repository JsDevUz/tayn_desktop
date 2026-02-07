import { Box, Typography, Dialog, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";

export default function DashboardModal({ open, onClose }) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
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
            Dashboard
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Empty Content */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          py: 8,
          bgcolor: '#fff',
          borderRadius: '16px'
        }}>
          <DashboardIcon sx={{ fontSize: 64, color: '#ddd', mb: 2 }} />
          <Typography sx={{ fontSize: 16, color: 'text.secondary' }}>
            Dashboard tez orada qo'shiladi
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
