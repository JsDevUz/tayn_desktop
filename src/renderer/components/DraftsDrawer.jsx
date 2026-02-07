import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  Tabs,
  Tab,
  Button,
  Paper,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DraftsOutlinedIcon from "@mui/icons-material/DraftsOutlined";
import ScheduleIcon from "@mui/icons-material/Schedule";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";

export default function DraftsDrawer({
  open,
  onClose,
  onRestoreSale,
  canRestoreSale,
  openTabSaleIds = [],
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [pendingSales, setPendingSales] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadPendingSales();
    }
  }, [open]);

  const loadPendingSales = async () => {
    try {
      setLoading(true);

      // Load all draft/pending sales (not completed)
      const result = await window.electronAPI.db.query(`
        SELECT 
          s.id, 
          s.sale_code,
          s.total_amount, 
          s.final_amount,
          s.status,
          s.created_at,
          (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items_count,
          (SELECT SUM(total_price) FROM sale_items WHERE sale_id = s.id) as calculated_total
        FROM sales s
        WHERE s.status != 'completed'
        ORDER BY s.created_at DESC
        LIMIT 50
      `);

      if (result.success) {
        // Filter: only sales with items/amount AND not currently open in any tab
        const salesWithContent = (result.data.rows || []).filter(
          (sale) =>
            (sale.items_count > 0 || sale.total_amount > 0) &&
            !openTabSaleIds.includes(sale.id),
        );
        setPendingSales(salesWithContent);
      }
    } catch (error) {
      console.error("Error loading pending sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSale = async (sale) => {
    try {
      console.log("Restoring sale:", sale.id, "code:", sale.sale_code);

      // Load sale items
      const itemsResult = await window.electronAPI.db.query(
        `
        SELECT 
          si.id, 
          si.product_id,
          si.quantity,
          si.unit_price,
          si.total_price,
          p.name as product_name,
          p.sku,
          p.barcode,
          p.stock_quantity
        FROM sale_items si
        LEFT JOIN products p ON si.product_id::text = p.server_id::text
        WHERE si.sale_id::text = ?
      `,
        [sale.id],
      );

      console.log("Items result:", itemsResult);

      let cartItems = [];

      if (
        itemsResult.success &&
        itemsResult.data.rows &&
        itemsResult.data.rows.length > 0
      ) {
        cartItems = itemsResult.data.rows.map((item) => ({
          id: item.id,
          product: {
            id: item.product_id,
            server_id: item.product_id,
            name: item.product_name || `Mahsulot #${item.product_id}`,
            sku: item.sku,
            barcode: item.barcode,
            price: item.unit_price,
            stock_quantity: item.stock_quantity,
          },
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price) || 0,
          totalPrice: parseFloat(item.total_price) || 0,
        }));
      }

      console.log("Cart items:", cartItems);

      // Call restore with saleId, saleCode, and cartItems
      if (onRestoreSale) {
        onRestoreSale(sale.id, sale.sale_code, cartItems);
        onClose();
      } else {
        console.error("onRestoreSale callback not provided");
      }
    } catch (error) {
      console.error("Error restoring sale:", error);
    }
  };

  const formatPrice = (price) => Number(price || 0).toLocaleString();
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 400,
          bgcolor: "background.default",
        },
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            bgcolor: "background.paper",
            borderBottom: "1px solid #eee",
          }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
            Savdolar
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            bgcolor: "background.paper",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              flex: 1,
            },
          }}
        >
          <Tab
            icon={<DraftsOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Qoralamalar"
          />
          <Tab
            icon={<ScheduleIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Kechiktirilgan"
          />
        </Tabs>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          {activeTab === 0 ? (
            // Qoralamalar - Empty
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 8,
              }}
            >
              <DraftsOutlinedIcon sx={{ fontSize: 64, color: "#ddd", mb: 2 }} />
              <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                Qoralamalar tez orada qo'shiladi
              </Typography>
            </Box>
          ) : (
            // Kechiktirilgan - Pending Sales
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {loading ? (
                <Typography
                  sx={{ textAlign: "center", py: 4, color: "text.secondary" }}
                >
                  Yuklanmoqda...
                </Typography>
              ) : pendingSales.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 8,
                  }}
                >
                  <ScheduleIcon sx={{ fontSize: 64, color: "#ddd", mb: 2 }} />
                  <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                    Kechiktirilgan savdolar yo'q
                  </Typography>
                </Box>
              ) : (
                pendingSales.map((sale) => (
                  <Paper
                    key={sale.id}
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "primary.main",
                          }}
                        >
                          #{sale.sale_code || "----"}
                        </Typography>
                        <Typography
                          sx={{ fontSize: 11, color: "text.secondary" }}
                        >
                          {formatDate(sale.created_at)}
                        </Typography>
                        <Typography
                          sx={{ fontSize: 14, fontWeight: 600, mt: 0.5 }}
                        >
                          {sale.items_count || 0} ta mahsulot
                        </Typography>
                      </Box>
                      <Typography
                        sx={{ fontSize: 15, fontWeight: 700, color: "#ff6b35" }}
                      >
                        {formatPrice(
                          sale.calculated_total || sale.total_amount,
                        )}{" "}
                        so'm
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 0.5 }} />

                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddShoppingCartIcon />}
                      onClick={() => handleRestoreSale(sale)}
                      disabled={!canRestoreSale}
                      sx={{
                        bgcolor: canRestoreSale ? "#4caf50" : "#ccc",
                        borderRadius: "8px",
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": {
                          bgcolor: canRestoreSale ? "#388e3c" : "#ccc",
                        },
                      }}
                    >
                      {canRestoreSale
                        ? "Savdoga qo'shish"
                        : "Tablar to'lgan (max 4)"}
                    </Button>
                  </Paper>
                ))
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
