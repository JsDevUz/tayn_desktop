import React, { useState, useEffect } from "react";
import { checkInternetConnection } from "../utils/network";
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from "@mui/material";
import AuthService from "../../services/auth";
import { api } from "../../services/axios";

const StoreSelector = ({ onSelectionComplete }) => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locations, setLocations] = useState([]);
  console.log("eee");

  useEffect(() => {
    const authService = new AuthService();
    const isAuthenticated = authService.loadFromStorage();

    console.log("Is authenticated:", isAuthenticated);
    console.log("Auth token:", localStorage.getItem("auth_token"));

    if (!isAuthenticated) {
      setError("Authentication required. Please login again.");
      setLoading(false);
      return;
    }

    const stores = authService.stores || [];
    console.log("User stores:", stores);
    setStores(stores);

    if (stores.length === 1) {
      // Auto-select single store
      const singleStore = stores[0];
      setSelectedStore(singleStore.id);

      // Fetch products for this store first, then auto-complete
      fetchStoreLocations(singleStore.id)
        .then(() => {
          // After sync is complete, proceed with auto-select
          handleAutoSelect(singleStore);
        })
        .catch((error) => {
          console.error("Auto-select failed:", error);
          setLoading(false);
        });
      return; // Don't set loading=false yet, wait for sync
    }

    setLoading(false);
  }, []);

  const fetchStoreLocations = async (storeId) => {
    // Check internet connection first
    const isOnline = await checkInternetConnection();
    if (!isOnline) {
      console.log("Offline mode: Skipping product sync");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      console.log("Token before API call:", token);

      if (!token) {
        setError("Authentication token not found");
        return;
      }

      const data = await api.get(`/locations/by-store/${storeId}`);
      console.log("Store products:", data);

      // Sync products to local PostgreSQL database
      if (data.data.products && data.data.products.length > 0) {
        await syncProductsToLocalDB(data.data.products, storeId); // Pass storeId
        console.log("Products synced to local DB");
      }

      setLocations(data.data.products || []);

      // Don't call onSelectionComplete here - let handleAutoSelect or handleManualSelect do it
    } catch (error) {
      console.error("Error fetching store products:", error);
      if (error.response?.status === 401) {
        setError("Authentication expired. Please login again.");
        // Clear auth and redirect to login
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        localStorage.removeItem("company");
        localStorage.removeItem("warehouses");
        localStorage.removeItem("stores");
        window.location.reload();
      } else {
        setError("Failed to fetch store products");
      }
    }
  };

  const syncProductsToLocalDB = async (products, targetStoreId) => {
    try {
      console.log(
        "Syncing",
        products.length,
        "products to local DB for store:",
        targetStoreId,
      );

      const authService = new AuthService();
      authService.loadFromStorage();
      const company = authService.company;

      if (!company) {
        console.error("Company not found in auth service");
        return;
      }

      for (const product of products) {
        // Check existing product by id (UUID)
        const existingResult = await window.electronAPI.db.query(
          `
          SELECT id FROM products WHERE id = ?
        `,
          [product.id],
        );

        const existing = existingResult.success
          ? existingResult.data.rows || []
          : [];
        // Fix: Use stable batch ID if not provided, to prevent duplicates on every sync
        const batchId = product.batchId || "default";

        if (existing.length === 0) {
          // Insert new product
          const insertResult = await window.electronAPI.db.query(
            `
            INSERT INTO products (
              id, name, sku, barcode, description, 
              base_retail_price, status, type, company_id,
              can_split, packaging, measurement, unit_type, unit_name,
              created_at, updated_at, is_sync
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true)
          `,
            [
              product.id,
              product.name,
              product.sku,
              product.barcode,
              product.description,
              product.baseRetailPrice || 0,
              product.status || "ACTIVE",
              "physical",
              company.id,
              product.canSplit || false,
              JSON.stringify(product.packaging || {}),
              JSON.stringify(product.measurement || {}),
              product.unitType || "pice",
              product.unitName || "dona",
            ],
          );

          console.log(
            "📦 Product INSERT result for",
            product.name,
            ":",
            insertResult,
          );

          // Insert into product_stocks
          await window.electronAPI.db.query(
            `
            INSERT INTO product_stocks (
              product_id, location_type, location_id, quantity, 
              supply_price, retail_price, batch_id, expires_at, is_sync
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)
          `,
            [
              product.id,
              "store",
              targetStoreId, // Use passed storeId to avoid state race condition
              product.stockQuantity || 0,
              product.supplyPrice || 0,
              product.retailPrice || 0,
              batchId,
              product.expiresAt || null,
            ],
          );
        } else {
          // Update existing product
          await window.electronAPI.db.query(
            `
            UPDATE products SET 
              name = ?, sku = ?, barcode = ?, description = ?,
              base_retail_price = ?, status = ?,
              can_split = ?, packaging = ?, measurement = ?, unit_type = ?, unit_name = ?,
              updated_at = CURRENT_TIMESTAMP, is_sync = true
            WHERE id = ?
          `,
            [
              product.name,
              product.sku,
              product.barcode,
              product.description,
              product.baseRetailPrice || 0,
              product.status || "ACTIVE",
              product.canSplit || product.can_split || false,
              JSON.stringify(product.packaging || {}),
              JSON.stringify(product.measurement || {}),
              product.unitType || product.unit_type || "pice",
              product.unitName || product.unit_name || "dona",
              product.id,
            ],
          );

          // Check if stock exists for this product and batch in this store
          const existingStockResult = await window.electronAPI.db.query(
            `
            SELECT id FROM product_stocks 
            WHERE product_id = ? AND location_id = ? AND batch_id = ?
          `,
            [product.id, targetStoreId, batchId],
          );

          if (
            existingStockResult.success &&
            existingStockResult.data.rows.length === 0
          ) {
            await window.electronAPI.db.query(
              `
              INSERT INTO product_stocks (
                product_id, location_type, location_id, quantity, 
                supply_price, retail_price, batch_id, expires_at, is_sync
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)
            `,
              [
                product.id,
                "store",
                targetStoreId,
                product.stockQuantity || 0,
                product.supplyPrice || 0,
                product.retailPrice || 0,
                batchId,
                product.expiresAt || null,
              ],
            );
          } else {
            // Update existing stock
            await window.electronAPI.db.query(
              `
              UPDATE product_stocks SET
                quantity = ?, supply_price = ?, retail_price = ?,
                updated_at = CURRENT_TIMESTAMP, is_sync = true
              WHERE product_id = ? AND location_id = ? AND batch_id = ?
            `,
              [
                product.stockQuantity || 0,
                product.supplyPrice || 0,
                product.retailPrice || 0,
                product.id,
                targetStoreId,
                batchId,
              ],
            );
          }
        }
      }

      console.log("Products synced to local DB successfully");
    } catch (error) {
      console.error("Error syncing products to local DB:", error);
      throw error;
    }
  };

  const handleAutoSelect = (store) => {
    const authService = new AuthService();
    authService.loadFromStorage();

    const selectedStoreData = authService.stores.find((s) => s.id === store.id);

    if (selectedStoreData) {
      authService.setSelectedStore(selectedStoreData);
      localStorage.setItem("selected_store_id", selectedStoreData.id);

      // Complete selection without API call
      onSelectionComplete();
    }
  };

  const handleSubmit = () => {
    if (!selectedStore) {
      setError("Iltimos, do'konni tanlang");
      return;
    }

    const authService = new AuthService();
    authService.loadFromStorage();

    // Fix: Remove parseInt since IDs are UUID strings
    const store = authService.stores.find((s) => s.id === selectedStore);

    // Find corresponding warehouse (first warehouse from company)
    const warehouse =
      authService.warehouses.length > 0 ? authService.warehouses[0] : null;

    if (store) {
      authService.setSelectedStore(store);
      if (warehouse) {
        authService.setSelectedWarehouse(warehouse);
      }

      // Complete selection without API call
      onSelectionComplete();
    }
  };

  const handleManualSelect = () => {
    if (!selectedStore) {
      setError("Iltimos, do'konni tanlang");
      return;
    }

    const authService = new AuthService();
    authService.loadFromStorage();

    const selectedStoreData = authService.stores.find(
      (s) => s.id === selectedStore,
    );

    if (selectedStoreData) {
      authService.setSelectedStore(selectedStoreData);
      localStorage.setItem("selected_store_id", selectedStoreData.id);

      // Complete selection without API call
      onSelectionComplete();
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Yuklanmoqda...</Typography>
      </Box>
    );
  }

  // If auto-selecting, show loading
  if (stores.length === 1 && selectedStore) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Do\'kon avtomatik tanlanmoqda...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        padding: 2,
      }}
    >
      <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
        Do\'konni tanlang
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, width: "100%", maxWidth: 400 }}>
          {error}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 3, maxWidth: 400 }}>
        <InputLabel id="store-select-label">Do\'kon</InputLabel>
        <Select
          labelId="store-select-label"
          value={selectedStore}
          label="Do'kon"
          onChange={(e) => {
            setSelectedStore(e.target.value);
            setError("");
            // Don't fetch locations - products already loaded
          }}
        >
          {stores.map((store) => (
            <MenuItem key={store.id} value={store.id}>
              {store.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button variant="contained" onClick={handleSubmit} sx={{ minWidth: 200 }}>
        Davom etish
      </Button>
    </Box>
  );
};

export default StoreSelector;
