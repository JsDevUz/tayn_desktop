import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  IconButton,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { syncService } from "../../services/sync";

const paymentTypes = [
  { id: "cash", label: "Naqd", shortcut: "F1", enabled: true },
  { id: "humo", label: "Humo", shortcut: "F2", enabled: true },
  { id: "uzcard", label: "Uzcard", shortcut: "F3", enabled: true },
  { id: "click", label: "Click", shortcut: "F5", enabled: true },
  { id: "payme", label: "Payme", shortcut: "F7", enabled: true },
  { id: "uzum", label: "Uzum", shortcut: "F6", enabled: true },
  { id: "alif", label: "Alif", shortcut: "", enabled: false },
  {
    id: "balans",
    label: "Balans",
    shortcut: "",
    enabled: false,
    balance: "0 so'm",
  },
];

export default function PaymentModal({
  open,
  onClose,
  saleId,
  cartItems,
  onPaymentComplete,
}) {
  const [selectedPayments, setSelectedPayments] = useState([]);

  const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const paidAmount = selectedPayments.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0,
  );
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSelectedPayments([]);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      const keyMap = {
        F1: "cash",
        F2: "humo",
        F3: "uzcard",
        F5: "click",
        F6: "uzum",
        F7: "payme",
        F12: "submit",
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        if (e.key === "F12") {
          handlePayment();
        } else {
          handleAddPaymentType(keyMap[e.key]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, cartItems, selectedPayments]);

  const handleAddPaymentType = (typeId) => {
    const type = paymentTypes.find((t) => t.id === typeId);
    if (!type || !type.enabled) return;

    // Check if already added
    const existing = selectedPayments.find((p) => p.id === typeId);
    if (existing) {
      // If already added and has remaining, add remaining to it
      if (remainingAmount > 0) {
        setSelectedPayments((prev) =>
          prev.map((p) =>
            p.id === typeId
              ? {
                  ...p,
                  amount: (
                    (parseFloat(p.amount) || 0) + remainingAmount
                  ).toString(),
                }
              : p,
          ),
        );
      }
      return;
    }

    // Add new payment with remaining amount as default
    setSelectedPayments((prev) => [
      ...prev,
      {
        id: typeId,
        label: type.label,
        amount: remainingAmount > 0 ? remainingAmount.toString() : "",
      },
    ]);
  };

  const handleRemovePayment = (typeId) => {
    setSelectedPayments((prev) => prev.filter((p) => p.id !== typeId));
  };

  const handleAmountChange = (typeId, value) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    const newValue = parseInt(numericValue) || 0;

    // Calculate other payments total
    const otherTotal = selectedPayments
      .filter((p) => p.id !== typeId)
      .reduce((sum, p) => sum + (parseInt(p.amount) || 0), 0);

    // Ensure total doesn't exceed totalAmount
    if (newValue + otherTotal > totalAmount) {
      const maxAllowed = Math.max(0, totalAmount - otherTotal);
      setSelectedPayments((prev) =>
        prev.map((p) =>
          p.id === typeId ? { ...p, amount: maxAllowed.toString() } : p,
        ),
      );
    } else {
      setSelectedPayments((prev) =>
        prev.map((p) => (p.id === typeId ? { ...p, amount: numericValue } : p)),
      );
    }
  };

  const handlePayment = async () => {
    if (!saleId || cartItems.length === 0) {
      alert("Savat bo'sh yoki sale yaratilmagan");
      return;
    }

    if (paidAmount < totalAmount) {
      alert(
        `To'liq summa kiritilmagan. To'lash kerak: ${formatPrice(totalAmount)} so'm, Kiritilgan: ${formatPrice(paidAmount)} so'm`,
      );
      return;
    }

    try {
      // Start transaction
      await window.electronAPI.db.query("BEGIN TRANSACTION");

      try {
        // Format: S-YYMMDD-XXXX (e.g. S-240207-1234) fits in VARCHAR(20)
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
        const randomStr = Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0");
        const saleCode = `S-${dateStr}-${randomStr}`;

        // Update sale with final amounts and status
        const saleResult = await window.electronAPI.db.query(
          `
          UPDATE sales SET 
            total_amount = ?,
            discount_amount = 0,
            tax_amount = 0,
            final_amount = ?,
            sale_code = ?,
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            is_sync = false
          WHERE id = ?
        `,
          [totalAmount, totalAmount, saleCode, saleId],
        );

        if (!saleResult.success) {
          console.error("Sale update failed:", saleResult.error);
          throw new Error(
            "Failed to update sale: " + (saleResult.error || "Unknown error"),
          );
        }

        // Create stock movements for each cart item
        const storeId = localStorage.getItem("selected_store_id");
        for (const item of cartItems) {
          // Check stock in product_stocks table
          const currentStockResult = await window.electronAPI.db.query(
            `
            SELECT quantity FROM product_stocks 
            WHERE product_id = ? AND location_type = 'store' AND location_id = ?
          `,
            [item.product.id, storeId],
          );

          let currentStock = 0;
          if (
            currentStockResult.success &&
            currentStockResult.data.rows.length > 0
          ) {
            currentStock =
              Number(currentStockResult.data.rows[0].quantity) || 0;
          } else {
            // If no stock record exists, treat as 0
            currentStock = 0;
          }

          // Calculate quantity change in BASE units.
          // item.quantity is in "Packs" (decimal).
          // If split is allowed and unitsPerPack > 1, then we need to multiply by unitsPerPack.
          // e.g. 1.5 packs * 10 units/pack = 15 units.
          // If NOT split allowed or unitsPerPack=1, item.quantity is already base units.

          let quantityChange = item.quantity;
          const unitsPerPack = item.product.packaging?.unitsPerPack || 1;

          if (item.product.can_split && unitsPerPack > 1) {
            // Use Math.round to avoid floating point errors
            quantityChange = Math.round(item.quantity * unitsPerPack);
          }

          const newStock = currentStock - quantityChange;

          if (newStock < 0) {
            throw new Error(
              `Yetarli zaxira yo'q: ${item.product.name}. Mavjud: ${currentStock}, Kerak: ${quantityChange}`,
            );
          }

          // Generate unique ID for this stock_movement record
          const stockMovementId = crypto.randomUUID
            ? crypto.randomUUID()
            : "SM-" + Date.now() + "-" + item.product.id;

          const movementResult = await window.electronAPI.db.query(
            `
            INSERT INTO stock_movements (
              id, product_id, batch_id, movement_id, location_id, location_type,
              event, direction, quantity_before, quantity_change, quantity_after,
              status, is_sync
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false)
          `,
            [
              stockMovementId, // The stock_movement's own ID
              item.product.server_id || item.product.id,
              "BATCH-" + Date.now(),
              saleId, // movement_id = saleId (reference to the sale)
              storeId,
              "store",
              "sale",
              "out",
              currentStock,
              -quantityChange,
              newStock,
              "completed",
            ],
          );

          if (!movementResult.success) {
            throw new Error(
              `Failed to create stock movement for ${item.product.name}`,
            );
          }

          // Update product_stocks (the real source of truth)
          console.log("📦 Updating product_stocks:", {
            productId: item.product.id,
            storeId,
            quantity: quantityChange,
          });

          const stockResult = await window.electronAPI.db.query(
            `
            UPDATE product_stocks SET 
              quantity = quantity - ?,
              updated_at = CURRENT_TIMESTAMP,
              is_sync = false
            WHERE product_id = ? AND location_type = 'store' AND location_id = ?
          `,
            [quantityChange, item.product.id, storeId],
          );

          console.log("📦 Stock update result:", stockResult);

          if (!stockResult.success) {
            console.error("Stock update failed:", stockResult.error, {
              productId: item.product.id,
              storeId,
              quantity: item.quantity,
            });
            throw new Error(
              `Zaxirani yangilashda xatolik: ${item.product.name} - ${stockResult.error || "Unknown error"}`,
            );
          }
        }

        await window.electronAPI.db.query("COMMIT");

        if (onPaymentComplete) {
          onPaymentComplete({
            saleId,
            totalAmount,
            cartItems,
            payments: selectedPayments,
          });
        }

        onClose();
        alert("To'lov muvaffaqiyatli amalga oshirildi!");

        // Trigger immediate sync if online
        if (navigator.onLine) {
          console.log("🔄 Online - triggering immediate sync...");
          syncService.syncAll();
        }
      } catch (error) {
        await window.electronAPI.db.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error completing sale:", error);
      alert(`To'lovni amalga oshirishda xatolik: ${error.message}`);
    }
  };

  const formatPrice = (price) => Number(price).toLocaleString();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
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
        {/* Header with Close */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Total Summary - Full Width */}
        <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
          <Paper sx={{ flex: 1, p: 3, borderRadius: "16px" }}>
            <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 1 }}>
              Jami:
            </Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 800 }}>
              {formatPrice(totalAmount)} so'm
            </Typography>
          </Paper>
          <Paper sx={{ flex: 1, p: 3, borderRadius: "16px" }}>
            <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 1 }}>
              To'lash kerak:
            </Typography>
            <Typography
              sx={{
                fontSize: 32,
                fontWeight: 800,
                color: remainingAmount > 0 ? "#ff6b35" : "#4caf50",
              }}
            >
              {formatPrice(remainingAmount)} so'm
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ display: "flex", gap: 3 }}>
          {/* Payment Types Section */}
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
              To'lov turi:
            </Typography>

            {/* Payment Type Buttons */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 2,
              }}
            >
              {paymentTypes.map((type) => {
                const isSelected = selectedPayments.find(
                  (p) => p.id === type.id,
                );
                const isDisabled = !type.enabled || remainingAmount <= 0;
                return (
                  <Paper
                    key={type.id}
                    onClick={() => !isDisabled && handleAddPaymentType(type.id)}
                    sx={{
                      p: 2,
                      borderRadius: "16px",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.5 : 1,
                      border: isSelected
                        ? "2px solid #1976d2"
                        : "2px solid transparent",
                      bgcolor: isSelected ? "#e3f2fd" : "#fff",
                      transition: "all 0.2s",
                      boxShadow: "none",
                      "&:hover": !isDisabled
                        ? { bgcolor: isSelected ? "#e3f2fd" : "#f5f5f5" }
                        : {},
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: isDisabled ? "text.secondary" : "text.primary",
                        }}
                      >
                        {type.label}
                      </Typography>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.5,
                          bgcolor: "#eee",
                          borderRadius: "8px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "text.secondary",
                        }}
                      >
                        {type.shortcut || "no"}
                      </Box>
                    </Box>
                    {type.balance && (
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}
                      >
                        {type.balance}
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Box>

            {/* Selected Payment Inputs */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 2,
                mt: 3,
              }}
            >
              {selectedPayments.map((payment) => (
                <Paper
                  key={payment.id}
                  sx={{
                    borderRadius: "16px",
                    border: "2px solid #1976d2",
                    overflow: "hidden",
                    boxShadow: "none",
                  }}
                >
                  {/* Header */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      px: 2,
                      py: 1,
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      {payment.label}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemovePayment(payment.id)}
                      sx={{ p: 0.5 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Amount Input */}
                  <Box sx={{ p: 2 }}>
                    <TextField
                      fullWidth
                      value={payment.amount}
                      onChange={(e) =>
                        handleAmountChange(payment.id, e.target.value)
                      }
                      placeholder="0"
                      autoFocus
                      inputProps={{ inputMode: "numeric" }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          border: "none",
                          "& fieldset": { border: "none" },
                        },
                        "& input": {
                          fontSize: 20,
                          fontWeight: 700,
                          p: 0,
                          textAlign: "left",
                        },
                      }}
                    />
                  </Box>
                </Paper>
              ))}

              {/* Empty slots */}
              {Array.from({
                length: Math.max(0, 8 - selectedPayments.length),
              }).map((_, idx) => (
                <Paper
                  key={`empty-${idx}`}
                  sx={{
                    height: 100,
                    borderRadius: "16px",
                    border: "2px dashed #ddd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "none",
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Receipt Preview */}
          <Paper
            sx={{
              width: 320,
              p: 3,
              borderRadius: "16px",
              bgcolor: "background.paper",
              maxHeight: 450,
              overflow: "auto",
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                textAlign: "center",
                mb: 2,
                fontFamily: "monospace",
              }}
            >
              APTEKA SPORT TOVAR
            </Typography>
            <Box
              sx={{
                borderTop: "1px dashed #ccc",
                borderBottom: "1px dashed #ccc",
                py: 2,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  textAlign: "center",
                }}
              >
                Chilanzar r-n, Chilanzar-7
              </Typography>
              <Typography
                sx={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  textAlign: "center",
                }}
              >
                kvartal, ul. Mukimi, 1/1
              </Typography>
            </Box>

            <Box sx={{ fontSize: 11, fontFamily: "monospace" }}>
              {[
                { label: "STIR:", value: "303970073" },
                {
                  label: "Sotuv raqami:",
                  value: `#${saleId?.slice(-7) || "0000000"}`,
                },
                { label: "Do'kon:", value: "APTEKA SPORT TOVAR" },
                { label: "Kontakt:", value: "+998952003600" },
                {
                  label: "Sana:",
                  value: new Date().toLocaleDateString("uz-UZ"),
                },
              ].map((row) => (
                <Box
                  key={row.label}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "text.secondary",
                    }}
                  >
                    {row.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      fontWeight: 600,
                    }}
                  >
                    {row.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ borderTop: "1px dashed #ccc", mt: 2, pt: 2 }}>
              {cartItems.map((item, idx) => (
                <Box key={item.id} sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: 11, fontFamily: "monospace" }}>
                    {idx + 1}. {item.product.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      textAlign: "right",
                    }}
                  >
                    {item.quantity} X {formatPrice(item.unitPrice)} ={" "}
                    {formatPrice(item.totalPrice)} so'm
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ borderTop: "1px dashed #ccc", mt: 2, pt: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontFamily: "monospace",
                    fontWeight: 800,
                  }}
                >
                  Yakuniy narx
                </Typography>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontFamily: "monospace",
                    fontWeight: 800,
                  }}
                >
                  {formatPrice(totalAmount)} so'm
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Submit Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={handlePayment}
          disabled={cartItems.length === 0 || selectedPayments.length === 0}
          sx={{
            mt: 3,
            height: 56,
            borderRadius: "28px",
            fontSize: 16,
            fontWeight: 700,
            bgcolor: "#1a1a2e",
            "&:hover": { bgcolor: "#0f0f1a" },
            "&:disabled": { bgcolor: "#ccc" },
          }}
        >
          TO'LASH
          <Box
            sx={{
              ml: 2,
              px: 1.5,
              py: 0.5,
              bgcolor: "rgba(255,255,255,0.2)",
              borderRadius: "8px",
              fontSize: 12,
            }}
          >
            F12
          </Box>
        </Button>
      </Box>
    </Dialog>
  );
}
