import { useState, useEffect } from "react";
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Dialog, 
  IconButton, 
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";

export default function ProductSelectorModal({ open, onClose, onProductSelect }) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" or "grid"

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const currentStoreId = localStorage.getItem('selected_store_id');

      const result = await window.electronAPI.db.query(`
        SELECT 
          p.id, 
          p.name, 
          p.sku, 
          p.barcode, 
          COALESCE(NULLIF(MAX(ps.retail_price), 0), p.base_retail_price, 0) as price,
          COALESCE(SUM(ps.quantity), 0) as stock_quantity 
        FROM products p
        LEFT JOIN product_stocks ps 
          ON p.id = ps.product_id 
          AND ps.location_type = 'store' 
          AND ps.location_id = ?
        WHERE UPPER(p.status) = 'ACTIVE'
        GROUP BY p.id, p.name, p.sku, p.barcode, p.base_retail_price
        ORDER BY p.name
      `, [currentStoreId]);

      if (result.success) {
        setProducts(result.data.rows || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (product) => {
    const currentStoreId = localStorage.getItem('selected_store_id');
    const stockResult = await window.electronAPI.db.query(`
      SELECT COALESCE(SUM(quantity), 0) as stock_quantity 
      FROM product_stocks 
      WHERE product_id = ? AND location_type = 'store' AND location_id = ?
    `, [product.id, currentStoreId]);
    
    let updatedProduct = { ...product };
    if (stockResult.success && stockResult.data.rows.length > 0) {
      updatedProduct.stock_quantity = stockResult.data.rows[0].stock_quantity || 0;
    }
    
    if (onProductSelect) {
      onProductSelect(updatedProduct);
    }
  };

  const formatPrice = (price) => Number(price || 0).toLocaleString();

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.includes(searchTerm)
  );

  const renderTableView = () => (
    <TableContainer component={Paper} sx={{ borderRadius: '16px', maxHeight: 450 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Nomi</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>SKU</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Shtrix-kod</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover', textAlign: 'right' }}>Narxi</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover', textAlign: 'center' }}>Qoldiq</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover', width: 60 }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Yuklanmoqda...</Typography>
              </TableCell>
            </TableRow>
          ) : filteredProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Mahsulot topilmadi</Typography>
              </TableCell>
            </TableRow>
          ) : (
            filteredProducts.map((product) => (
              <TableRow 
                key={product.id}
                hover
                sx={{ '&:hover': { bgcolor: 'background.default' }, cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography sx={{ fontWeight: 500, fontSize: 13 }}>{product.name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{product.sku || '-'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{product.barcode || '-'}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#ff6b35' }}>
                    {formatPrice(product.price)} so'm
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Typography sx={{ 
                    fontSize: 12, 
                    fontWeight: 600,
                    color: (product.stock_quantity || 0) > 0 ? '#4caf50' : '#f44336'
                  }}>
                    {product.stock_quantity || 0}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small"
                    onClick={() => handleAddProduct(product)}
                    sx={{ bgcolor: '#4caf50', color: '#fff', '&:hover': { bgcolor: '#388e3c' }, width: 32, height: 32 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGridView = () => (
    <Box sx={{ maxHeight: 450, overflow: 'auto', p: 1 }}>
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">Yuklanmoqda...</Typography>
        </Box>
      ) : filteredProducts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">Mahsulot topilmadi</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          {filteredProducts.map((product) => (
            <Paper
              key={product.id}
              sx={{
                p: 2,
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { 
                  boxShadow: 4,
                  transform: 'translateY(-2px)'
                }
              }}
            >
              {/* Product Image Placeholder */}
              <Box sx={{ 
                width: '100%', 
                height: 100, 
                bgcolor: '#f0f0f0', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5
              }}>
                <Typography sx={{ fontSize: 32, color: '#ccc' }}>📦</Typography>
              </Box>

              {/* Product Name */}
              <Typography sx={{ 
                fontWeight: 600, 
                fontSize: 13, 
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {product.name}
              </Typography>

              {/* SKU */}
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>
                {product.sku || 'SKU yo\'q'}
              </Typography>

              {/* Price & Stock */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#ff6b35' }}>
                  {formatPrice(product.price)} so'm
                </Typography>
                <Typography sx={{ 
                  fontSize: 11, 
                  fontWeight: 600,
                  px: 1,
                  py: 0.3,
                  borderRadius: '6px',
                  bgcolor: (product.stock_quantity || 0) > 0 ? '#e8f5e9' : '#ffebee',
                  color: (product.stock_quantity || 0) > 0 ? '#4caf50' : '#f44336'
                }}>
                  {product.stock_quantity || 0} ta
                </Typography>
              </Box>

              {/* Add Button */}
              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleAddProduct(product)}
                sx={{
                  bgcolor: '#4caf50',
                  '&:hover': { bgcolor: '#388e3c' },
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Qo'shish
              </Button>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );

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
            Mahsulotlar ro'yxati
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Search & View Toggle */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Qidirish: nomi, shtrix-kod, SKU"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                bgcolor: '#fff',
              }
            }}
          />
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                borderRadius: '10px',
                px: 1.5,
                '&.Mui-selected': {
                  bgcolor: '#1976d2',
                  color: '#fff',
                  '&:hover': { bgcolor: '#1565c0' }
                }
              }
            }}
          >
            <ToggleButton value="table">
              <ViewListIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="grid">
              <GridViewIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Products View */}
        {viewMode === "table" ? renderTableView() : renderGridView()}

        {/* Footer with count */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Jami: {filteredProducts.length} ta mahsulot
          </Typography>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Yopish
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
