import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert
} from '@mui/material';
import AuthService from '../../services/auth';

const WarehouseStoreSelector = ({ onSelectionComplete }) => {
  const [warehouses, setWarehouses] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    const authService = new AuthService();
    console.log(stores,authService);
    authService.loadFromStorage();
    setWarehouses(authService.warehouses);
    setStores(authService.stores);
  }, []);
    console.log(stores);

  const handleSubmit = () => {
    if (!selectedWarehouse || !selectedStore) {
      setError('Iltimos, ombor va do\'konni tanlang');
      return;
    }

    const authService = new AuthService();
    authService.loadFromStorage();
    
    const warehouse = authService.warehouses.find(w => w.id === parseInt(selectedWarehouse));
    const store = authService.stores.find(s => s.id === parseInt(selectedStore));
    
    authService.setSelectedWarehouse(warehouse);
    authService.setSelectedStore(store);

    onSelectionComplete({ warehouse, store });
  };

  const filteredStores =  stores;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 500,
          boxShadow: 3,
          m: 2
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Ish joyini tanlang
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ombor va do'konni tanlang
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Ombor</InputLabel>
            <Select
              value={selectedWarehouse}
              label="Ombor"
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setSelectedStore('');
                setError('');
              }}
            >
              {warehouses.map((warehouse) => (
                <MenuItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Do'kon</InputLabel>
            <Select
              value={selectedStore}
              label="Do'kon"
              onChange={(e) => {
                setSelectedStore(e.target.value);
                setError('');
              }}
              disabled={!selectedWarehouse}
            >
              {filteredStores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSubmit}
          >
            Davom etish
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WarehouseStoreSelector;
