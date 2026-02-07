import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SaleDetailsModal from "./SaleDetailsModal";

export default function TodaySalesModal({ open, onClose }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);

  useEffect(() => {
    if (open) {
      loadTodaySales();
    }
  }, [open]);

  const loadTodaySales = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const result = await window.electronAPI.db.query(
        `
        SELECT 
          s.id, 
          s.total_amount, 
          s.final_amount, 
          s.status, 
          s.discount_amount,
          s.is_sync,
          s.created_at,
          COUNT(si.id) as items_count
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE DATE(s.created_at) = DATE(?) AND s.status = 'completed'
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `,
        [today],
      );

      if (result.success) {
        setSales(result.data.rows || []);
      }
    } catch (error) {
      console.error("Error loading today sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReprintReceipt = async (saleId) => {
    try {
      // TODO: Implement receipt printing
      console.log("Reprint receipt for sale:", saleId);
      // This would call the printer API
    } catch (error) {
      console.error("Error reprinting receipt:", error);
    }
  };

  const handleViewDetails = (saleId) => {
    setSelectedSaleId(saleId);
    setDetailsModalOpen(true);
  };

  const formatPrice = (price) => Number(price || 0).toLocaleString();
  const formatTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalSales = sales.reduce(
    (sum, s) => sum + (parseFloat(s.final_amount) || 0),
    0,
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            maxHeight: "85vh",
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
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
                Bugungi savdolar
              </Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                Jami: {formatPrice(totalSales)} so'm ({sales.length} ta savdo)
              </Typography>
            </Box>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Sales Table */}
          <TableContainer
            component={Paper}
            sx={{ borderRadius: "16px", maxHeight: 400 }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "action.hover" }}>
                    #
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "action.hover" }}>
                    Vaqti
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      bgcolor: "action.hover",
                      textAlign: "center",
                    }}
                  >
                    Mahsulotlar
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      bgcolor: "action.hover",
                      textAlign: "right",
                    }}
                  >
                    Chegirma
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
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      bgcolor: "action.hover",
                      textAlign: "center",
                      width: 80,
                    }}
                  >
                    Sync
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      bgcolor: "action.hover",
                      width: 100,
                    }}
                  >
                    Amallar
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">
                        Yuklanmoqda...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">
                        Bugun savdo yo'q
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale, index) => (
                    <TableRow key={sale.id} hover>
                      <TableCell>
                        <Typography
                          sx={{ fontSize: 12, color: "text.secondary" }}
                        >
                          {index + 1}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                          {formatTime(sale.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <Typography sx={{ fontSize: 12 }}>
                          {sale.items_count || 0} ta
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color:
                              sale.discount_amount > 0
                                ? "#f44336"
                                : "text.secondary",
                          }}
                        >
                          {sale.discount_amount > 0
                            ? `-${formatPrice(sale.discount_amount)}`
                            : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#4caf50",
                          }}
                        >
                          {formatPrice(sale.final_amount)} so'm
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            bgcolor: sale.is_sync ? "#e8f5e9" : "#fff3e0",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: sale.is_sync ? "#4caf50" : "#ff9800",
                            }}
                          >
                            {sale.is_sync ? "✓" : "○"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Chekni qayta chiqarish">
                            <IconButton
                              size="small"
                              onClick={() => handleReprintReceipt(sale.id)}
                              sx={{
                                bgcolor: "#e3f2fd",
                                "&:hover": { bgcolor: "#bbdefb" },
                              }}
                            >
                              <PrintIcon
                                sx={{ fontSize: 16, color: "#1976d2" }}
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Tafsilotlarni ko'rish">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(sale.id)}
                              sx={{
                                bgcolor: "#f3e5f5",
                                "&:hover": { bgcolor: "#e1bee7" },
                              }}
                            >
                              <VisibilityIcon
                                sx={{ fontSize: 16, color: "#7b1fa2" }}
                              />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Footer */}
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Yopish
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Sale Details Modal */}
      <SaleDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        saleId={selectedSaleId}
      />
    </>
  );
}
