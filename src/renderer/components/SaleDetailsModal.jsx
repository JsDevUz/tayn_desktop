import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Dialog,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import PaymentIcon from "@mui/icons-material/Payment";
import ReceiptIcon from "@mui/icons-material/Receipt";

export default function SaleDetailsModal({ open, onClose, saleId }) {
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && saleId) {
      loadSaleDetails();
    }
  }, [open, saleId]);

  const loadSaleDetails = async () => {
    try {
      setLoading(true);

      // Load sale info
      const saleResult = await window.electronAPI.db.query(
        `
        SELECT * FROM sales WHERE id = ?
      `,
        [saleId],
      );

      if (saleResult.success && saleResult.data.rows.length > 0) {
        setSale(saleResult.data.rows[0]);
      }

      // Load sale items
      const itemsResult = await window.electronAPI.db.query(
        `
        SELECT 
          si.*,
          p.name as product_name,
          p.sku,
          p.barcode
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `,
        [saleId],
      );

      console.log(
        "📦 Sale items query for saleId:",
        saleId,
        "Result:",
        itemsResult,
      );

      if (itemsResult.success) {
        setItems(itemsResult.data.rows || []);
      }

      // Load payments
      const paymentsResult = await window.electronAPI.db.query(
        `
        SELECT sp.*, pt.name as payment_type_name
        FROM sale_payments sp
        LEFT JOIN payment_types pt ON sp.payment_type_id = pt.id
        WHERE sp.sale_id = ?
      `,
        [saleId],
      );

      if (paymentsResult.success) {
        setPayments(paymentsResult.data.rows || []);
      }
    } catch (error) {
      console.error("Error loading sale details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => Number(price || 0).toLocaleString();
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          maxHeight: "90vh",
          bgcolor: "background.default",
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <ReceiptIcon sx={{ color: "#5c6bc0" }} />
            <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
              Savdo tafsilotlari
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {loading ? (
          <Typography
            sx={{ textAlign: "center", py: 4, color: "text.secondary" }}
          >
            Yuklanmoqda...
          </Typography>
        ) : (
          <>
            {/* Sale Info */}
            <Paper sx={{ p: 2, borderRadius: "12px", mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                    Sana
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    {formatDateTime(sale?.created_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                    Status
                  </Typography>
                  <Chip
                    label={
                      sale?.status === "completed"
                        ? "Yakunlangan"
                        : sale?.status
                    }
                    size="small"
                    sx={{
                      bgcolor:
                        sale?.status === "completed" ? "#e8f5e9" : "#fff3e0",
                      color:
                        sale?.status === "completed" ? "#4caf50" : "#ff9800",
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                    Jami summa
                  </Typography>
                  <Typography
                    sx={{ fontSize: 16, fontWeight: 700, color: "#4caf50" }}
                  >
                    {formatPrice(sale?.final_amount)} so'm
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Customer & Cashier Info */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Paper sx={{ flex: 1, p: 2, borderRadius: "12px" }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    Mijoz
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {sale?.customer_name || "Noma'lum mijoz"}
                </Typography>
              </Paper>
              <Paper sx={{ flex: 1, p: 2, borderRadius: "12px" }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <BadgeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    Kassir
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {sale?.cashier_name ||
                    "Kassir #" + (sale?.cashier_id?.slice(-6) || "-")}
                </Typography>
              </Paper>
            </Box>

            {/* Products Table */}
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
              Mahsulotlar ({items.length} ta)
            </Typography>
            <TableContainer
              component={Paper}
              sx={{ borderRadius: "12px", mb: 2, maxHeight: 200 }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 700, bgcolor: "action.hover" }}
                    >
                      Nomi
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: "action.hover",
                        textAlign: "center",
                      }}
                    >
                      Soni
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: "action.hover",
                        textAlign: "right",
                      }}
                    >
                      Narxi
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: "action.hover",
                        textAlign: "right",
                      }}
                    >
                      Jami
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
                          {item.product_name || "Mahsulot"}
                        </Typography>
                        <Typography
                          sx={{ fontSize: 10, color: "text.secondary" }}
                        >
                          {item.sku || ""}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <Typography sx={{ fontSize: 12 }}>
                          {item.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        <Typography sx={{ fontSize: 12 }}>
                          {formatPrice(item.unit_price)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                          {formatPrice(item.total_price)} so'm
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Payments */}
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 600,
                mb: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <PaymentIcon sx={{ fontSize: 18 }} />
              To'lovlar
            </Typography>
            <Paper sx={{ p: 2, borderRadius: "12px" }}>
              {payments.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  To'lov ma'lumotlari yo'q
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {payments.map((payment, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        py: 1,
                        borderBottom:
                          index < payments.length - 1
                            ? "1px solid #eee"
                            : "none",
                      }}
                    >
                      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                        {payment.payment_type_name || "To'lov"}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 14, fontWeight: 600, color: "#4caf50" }}
                      >
                        {formatPrice(payment.amount)} so'm
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>

            {/* Summary */}
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                {sale?.discount_amount > 0 && (
                  <Typography sx={{ fontSize: 12, color: "#f44336" }}>
                    Chegirma: -{formatPrice(sale.discount_amount)} so'm
                  </Typography>
                )}
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Yakuniy summa
                </Typography>
                <Typography
                  sx={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}
                >
                  {formatPrice(sale?.final_amount)} so'm
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Dialog>
  );
}
