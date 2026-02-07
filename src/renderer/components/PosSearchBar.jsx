import { useState, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Button,
  useTheme,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CachedIcon from "@mui/icons-material/Cached";
import PrintIcon from "@mui/icons-material/Print";
import FlagIcon from "@mui/icons-material/Flag";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import ProductSelectorModal from "./ProductSelectorModal";
import DashboardModal from "./DashboardModal";
import TodaySalesModal from "./TodaySalesModal";
import SettingsModal from "./SettingsModal";

export default function PosSearchBar({
  onProductSelect,
  cartItemsCount = 0,
  onRefresh,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [todaySalesModalOpen, setTodaySalesModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const searchInputRef = useRef(null);
  const theme = useTheme();

  // Global hotkey: / to focus search
  useHotkeys(
    "slash",
    (e) => {
      e.preventDefault();
      searchInputRef.current?.focus();
    },
    { enableOnFormTags: false },
  );

  // ArrowUp in search results (works in input too)
  useHotkeys(
    "up",
    (e) => {
      if (showDropdown && filteredProducts.length > 0) {
        e.preventDefault();
        setSelectedResultIndex((prev) => Math.max(0, prev - 1));
      }
    },
    { enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"] },
    [showDropdown, filteredProducts],
  );

  // ArrowDown in search results (works in input too)
  useHotkeys(
    "down",
    (e) => {
      if (showDropdown && filteredProducts.length > 0) {
        e.preventDefault();
        setSelectedResultIndex((prev) =>
          Math.min(filteredProducts.length - 1, prev + 1),
        );
      }
    },
    { enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"] },
    [showDropdown, filteredProducts],
  );

  // Enter to select result
  useHotkeys(
    "enter",
    (e) => {
      if (
        showDropdown &&
        filteredProducts.length > 0 &&
        filteredProducts[selectedResultIndex]
      ) {
        e.preventDefault();
        handleProductClick(filteredProducts[selectedResultIndex]);
      }
    },
    { enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"] },
    [showDropdown, filteredProducts, selectedResultIndex],
  );

  // Escape to close dropdown
  useHotkeys(
    "escape",
    () => {
      setShowDropdown(false);
      setSearchTerm("");
    },
    { enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"] },
  );

  // Reset selected index when filtered products change
  useEffect(() => {
    setSelectedResultIndex(0);
  }, [filteredProducts]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim() !== "") {
        loadProducts(searchTerm);
      } else {
        setFilteredProducts([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadProducts = async (query = "") => {
    try {
      setLoading(true);
      const currentStoreId = localStorage.getItem("selected_store_id");

      let sqlQuery = `
        SELECT 
          p.id, 
          p.name, 
          p.sku, 
          p.barcode, 
          p.can_split,
          p.packaging,
          COALESCE(NULLIF(MAX(ps.retail_price), 0), p.base_retail_price, 0) as price,
          COALESCE(SUM(ps.quantity), 0) as stock_quantity 
        FROM products p
        LEFT JOIN product_stocks ps 
          ON p.id = ps.product_id 
          AND ps.location_type = 'store' 
          AND ps.location_id = ?
        WHERE UPPER(p.status) = 'ACTIVE'
      `;

      const params = [currentStoreId];

      if (query) {
        sqlQuery += ` AND (p.name ILIKE ? OR p.sku ILIKE ? OR p.barcode ILIKE ?)`;
        const likeQuery = `%${query}%`;
        params.push(likeQuery, likeQuery, likeQuery);
      }

      sqlQuery += `
        GROUP BY p.id, p.name, p.sku, p.barcode, p.base_retail_price, p.can_split, p.packaging
        ORDER BY p.name
        LIMIT 20
      `;

      const result = await window.electronAPI.db.query(sqlQuery, params);

      if (result.success) {
        setFilteredProducts(result.data.rows || []);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error("Error searching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = async (product) => {
    setSearchTerm("");
    setShowDropdown(false);

    // Get real-time stock for this product
    const currentStoreId = localStorage.getItem("selected_store_id");
    const stockResult = await window.electronAPI.db.query(
      `
      SELECT COALESCE(SUM(quantity), 0) as stock_quantity 
      FROM product_stocks 
      WHERE product_id = ? AND location_type = 'store' AND location_id = ?
    `,
      [product.id, currentStoreId],
    );

    let updatedProduct = { ...product };
    if (stockResult.success && stockResult.data.rows.length > 0) {
      updatedProduct.stock_quantity =
        stockResult.data.rows[0].stock_quantity || 0;
      console.log(
        "Real-time stock for",
        product.name,
        ":",
        updatedProduct.stock_quantity,
      );
    }

    if (onProductSelect) {
      onProductSelect(updatedProduct);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Search Bar - Full Width */}
      <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
        <Box sx={{ flex: 1, position: "relative" }}>
          <TextField
            fullWidth
            placeholder={
              loading
                ? "Yuklanmoqda..."
                : products.length > 0
                  ? `Qidirish: nomi, shtrix-kod (${products.length} ta mahsulot)`
                  : "Mahsulotlar ro'yxati bo'sh"
            }
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
            inputRef={searchInputRef}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                bgcolor: "background.paper",
                height: 44,
              },
            }}
          />

          {showDropdown && filteredProducts.length > 0 && (
            <Paper
              sx={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 1000,
                maxHeight: 300,
                overflow: "auto",
                mt: 1,
                borderRadius: "12px",
                boxShadow: 3,
              }}
            >
              <List dense>
                {filteredProducts.map((product, index) => (
                  <ListItem
                    key={product.id}
                    button
                    onClick={() => handleProductClick(product)}
                    selected={index === selectedResultIndex}
                    sx={{
                      bgcolor:
                        index === selectedResultIndex
                          ? "#e3f2fd"
                          : "transparent",
                      "&:hover": {
                        bgcolor:
                          index === selectedResultIndex
                            ? "#e3f2fd"
                            : "action.hover",
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {product.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "#ff6b35", fontWeight: 600 }}
                          >
                            {product.price
                              ? `${Number(product.price).toLocaleString()} so'm`
                              : "Narx belgilanmagan"}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                          {product.sku && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              SKU: {product.sku}
                            </Typography>
                          )}
                          {product.barcode && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Barcode: {product.barcode}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Qoldiq: {product.stock_quantity || 0}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        {/* Add Product Button */}
        <IconButton
          onClick={() => setProductModalOpen(true)}
          sx={{
            bgcolor: "#4caf50",
            color: "#fff",
            borderRadius: "12px",
            width: 44,
            height: 44,
            "&:hover": { bgcolor: "#388e3c" },
          }}
        >
          <AddIcon />
        </IconButton>
      </Box>

      {/* Bottom Row - Cart Header, Actions, User Info */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Cart Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1,
            bgcolor: "background.paper",
            borderRadius: "12px",
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
            Korzina
          </Typography>
          <Badge
            badgeContent={cartItemsCount}
            color="error"
            sx={{
              "& .MuiBadge-badge": {
                bgcolor: "#f44336",
                color: "#fff",
                fontWeight: 700,
                minWidth: 22,
                height: 22,
                borderRadius: "6px",
              },
            }}
          >
            <DeleteOutlineIcon sx={{ color: "text.secondary" }} />
          </Badge>
        </Box>

        {/* Right Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton size="small" onClick={onRefresh}>
            <CachedIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            size="small"
            sx={{ bgcolor: "background.paper", borderRadius: "8px" }}
          >
            <PrintIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* User Info */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            py: 1,
            bgcolor: "background.paper",
            borderRadius: "12px",
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>JS Dev</Typography>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "#5c6bc0" }}>J</Avatar>
        </Box>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Quick Action Buttons */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Dashboard" arrow>
            <IconButton
              onClick={() => setDashboardModalOpen(true)}
              sx={{
                bgcolor: "#5c6bc0",
                color: "#fff",
                borderRadius: "10px",
                "&:hover": { bgcolor: "#4a5ab9" },
              }}
            >
              <DashboardIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bugungi savdolar" arrow>
            <IconButton
              onClick={() => setTodaySalesModalOpen(true)}
              sx={{
                bgcolor: "#4caf50",
                color: "#fff",
                borderRadius: "10px",
                "&:hover": { bgcolor: "#388e3c" },
              }}
            >
              <ReceiptLongIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sozlamalar" arrow>
            <IconButton
              onClick={() => setSettingsModalOpen(true)}
              sx={{
                bgcolor: "background.paper",
                borderRadius: "10px",
                "&:hover": { bgcolor: "background.default" },
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Product Selector Modal */}
      <ProductSelectorModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onProductSelect={onProductSelect}
      />

      {/* Dashboard Modal */}
      <DashboardModal
        open={dashboardModalOpen}
        onClose={() => setDashboardModalOpen(false)}
      />

      {/* Today Sales Modal */}
      <TodaySalesModal
        open={todaySalesModalOpen}
        onClose={() => setTodaySalesModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </Box>
  );
}
