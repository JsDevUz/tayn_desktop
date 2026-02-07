import { Box, Paper, Typography, IconButton, TextField } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export default function PosCartPanel({ saleId, cartItems, setCartItems }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef(null);

  // Reset selection when cart changes
  useEffect(() => {
    if (selectedIndex >= cartItems.length) {
      setSelectedIndex(Math.max(0, cartItems.length - 1));
    }
  }, [cartItems.length, selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (cartItems.length === 0) return;

      // Don't handle if already focused on an input
      const isInputFocused = document.activeElement?.tagName === "INPUT";

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(cartItems.length - 1, prev + 1));
      } else if (e.key === "Delete" && !isInputFocused) {
        e.preventDefault();
        if (cartItems[selectedIndex]) {
          handleRemoveItem(cartItems[selectedIndex].id);
        }
      } else if (!isInputFocused && /^[0-9]$/.test(e.key)) {
        // Number key pressed - focus quantity input and set value
        e.preventDefault();
        const qtyInput = document.querySelector(
          `[data-qty-input="${selectedIndex}"]`,
        );
        if (qtyInput) {
          qtyInput.value = e.key;
          qtyInput.focus();
          // Trigger change event
          const item = cartItems[selectedIndex];
          if (item) {
            handleQuantityChange(item.id, e.key);
          }
        }
      } else if (!isInputFocused && e.key === "+") {
        // + key - focus unit price input
        e.preventDefault();
        const priceInput = document.querySelector(
          `[data-price-input="${selectedIndex}"]`,
        );
        if (priceInput) {
          priceInput.focus();
          priceInput.select();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems, selectedIndex]);

  const handleQuantityChange = (itemId, newQuantity) => {
    const qty = parseFloat(newQuantity) || 0;

    // allow 0 to trigger removal, or handle it here
    if (qty <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newTotalPrice = qty * item.unitPrice;

          // Update DB - Fire and forget (or handle error)
          // We need to check if saleId exists, but item.id is sale_item.id
          window.electronAPI.db
            .query(
              `UPDATE sale_items SET quantity = ?, total_price = ?, is_sync = false WHERE id = ?`,
              [qty, newTotalPrice, itemId],
            )
            .catch((err) =>
              console.error("Failed to update cart item quantity:", err),
            );

          return {
            ...item,
            quantity: qty,
            totalPrice: newTotalPrice,
          };
        }
        return item;
      }),
    );
  };

  const handleRemoveItem = (itemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handlePriceChange = (itemId, newPrice) => {
    const price = parseInt(newPrice) || 0;
    if (price < 0) return;

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            unitPrice: price,
            totalPrice: item.quantity * price,
          };
        }
        return item;
      }),
    );
  };

  const formatPrice = (price) => {
    return Number(price).toLocaleString();
  };
  console.log(cartItems);

  return (
    <Paper
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      {/* Table Header */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "2fr 80px 100px 60px 140px 40px",
          alignItems: "center",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "#fafafa",
        }}
      >
        <Typography
          sx={{ fontSize: 12, color: "text.secondary", fontWeight: 500 }}
        >
          Nomi
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            color: "text.secondary",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Qoldiq
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            color: "text.secondary",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          O'p
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            color: "text.secondary",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Bo'lak
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            color: "text.secondary",
            fontWeight: 500,
            textAlign: "right",
          }}
        >
          Narxi
        </Typography>
        <Box />
      </Box>

      {/* Cart Items */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {cartItems.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  bgcolor: "grey.100",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <DeleteOutlineIcon
                  sx={{ color: "text.secondary", fontSize: 28 }}
                />
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
                Savat bo'sh
              </Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                Mahsulotlarni qidirish orqali qo'shing
              </Typography>
            </Box>
          </Box>
        ) : (
          cartItems.map((item, index) => (
            <Box
              key={item.id}
              onClick={() => setSelectedIndex(index)}
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 80px 100px 60px 140px 40px",
                alignItems: "center",
                px: 2,
                py: 1.5,
                borderBottom:
                  index < cartItems.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
                bgcolor: selectedIndex === index ? "#e3f2fd" : "transparent",
                cursor: "pointer",
                transition: "background-color 0.15s",
                "&:hover": {
                  bgcolor: selectedIndex === index ? "#e3f2fd" : "#fafafa",
                },
              }}
            >
              {/* Product Name & Barcode */}
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  {item.product.name}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                  {item.product.barcode || item.product.sku}
                </Typography>
              </Box>

              {/* Stock */}
              <Typography
                sx={{
                  fontSize: 13,
                  textAlign: "center",
                  color: "text.secondary",
                }}
              >
                {(() => {
                  const stock = item.product.stock_quantity || 0;
                  const unitsPerPack =
                    item.product.packaging?.unitsPerPack || 1;
                  const canSplit = item.product.can_split;

                  if (canSplit && unitsPerPack > 1) {
                    const packs = Math.floor(stock / unitsPerPack);
                    const units = stock % unitsPerPack;
                    return (
                      <>
                        <span style={{ fontWeight: 600 }}>{packs}</span>p{" "}
                        <span style={{ fontSize: "0.9em" }}>
                          {units > 0 ? `${units}d` : ""}
                        </span>
                      </>
                    );
                  }
                  return stock;
                })()}
              </Typography>

              {/* Quantity Input with max */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "left",
                  gap: 0.5,
                }}
              >
                <TextField
                  size="small"
                  type="number"
                  value={
                    item.product.can_split &&
                    (item.product.packaging?.unitsPerPack || 1) > 1
                      ? Math.floor(item.quantity)
                      : item.quantity
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const stock = item.product.stock_quantity || 0;
                    const unitsPerPack =
                      item.product.packaging?.unitsPerPack || 1;

                    if (item.product.can_split && unitsPerPack > 1) {
                      // Update only the integer packs part, keep the fractional units part
                      const currentUnitsPart =
                        item.quantity - Math.floor(item.quantity);
                      const newQuantity = Math.floor(val) + currentUnitsPart;

                      // Check if new quantity exceeds stock (in base units)
                      const newTotalUnits = Math.round(
                        newQuantity * unitsPerPack,
                      );
                      if (newTotalUnits <= stock) {
                        handleQuantityChange(item.id, newQuantity);
                      }
                    } else {
                      // Normal product (unitPerPack=1)
                      if (val <= stock) {
                        handleQuantityChange(item.id, val);
                      }
                    }
                  }}
                  inputProps={{ min: 1, "data-qty-input": index }}
                  sx={{
                    width: 50,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                      height: 32,
                    },
                    "& input": {
                      textAlign: "center",
                      p: 0.5,
                      fontSize: 13,
                    },
                  }}
                />
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                  /
                  {(() => {
                    const stock = item.product.stock_quantity || 0;
                    const unitsPerPack =
                      item.product.packaging?.unitsPerPack || 1;
                    const canSplit = item.product.can_split;

                    if (canSplit && unitsPerPack > 1) {
                      const packs = Math.floor(stock / unitsPerPack);
                      return `${packs}p`;
                    }
                    return stock;
                  })()}
                </Typography>
              </Box>

              {/* Unit Quantity Input (only if can_split is true) */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.product.can_split &&
                (item.product.packaging?.unitsPerPack || 1) > 1 ? (
                  <TextField
                    size="small"
                    type="number"
                    // Calculate display value: (quantity % 1) * unitsPerPack
                    // If quantity is 1.5 and unitsPerPack is 10, then 0.5 * 10 = 5 pieces
                    value={Math.round(
                      (item.quantity % 1) *
                        (item.product.packaging?.unitsPerPack || 1),
                    )}
                    onFocus={(e) => {
                      if (e.target.value == "0") {
                        e.target.value = "";
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value == "") {
                        e.target.value = "0";
                        // Ensure we strictly set the quantity back to visible packs + 0 units
                        // This prevents "empty" state lingering in internal logic if needed
                        const currentPacks = Math.floor(item.quantity);
                        handleQuantityChange(item.id, currentPacks);
                      }
                    }}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === "") return;

                      const val = parseInt(valStr) || 0;
                      const unitsPerPack =
                        item.product.packaging?.unitsPerPack || 1;

                      // Logic:
                      // If val < unitsPerPack: keep current packs, just update units
                      // If val >= unitsPerPack: add overflow packs to current packs

                      // Always start from the current INTEGER packs
                      const currentPacks = Math.floor(item.quantity);
                      let newQuantity;

                      if (val < unitsPerPack) {
                        // Just update the fractional part
                        newQuantity = currentPacks + val / unitsPerPack;
                      } else {
                        // Calculate overflow from the input
                        const extraPacks = Math.floor(val / unitsPerPack);
                        const remainingUnits = val % unitsPerPack;

                        // Add extraPacks to currentPacks
                        newQuantity =
                          currentPacks +
                          extraPacks +
                          remainingUnits / unitsPerPack;
                      }

                      // Check if new quantity exceeds stock (in base units)
                      const stock = item.product.stock_quantity || 0;
                      // Use Math.round to check total base units validity
                      const approxTotalBaseUnits = Math.round(
                        newQuantity * unitsPerPack,
                      );

                      if (approxTotalBaseUnits <= stock) {
                        handleQuantityChange(item.id, newQuantity);
                      }
                    }}
                    inputProps={{
                      min: 0,
                      "data-split-input": index,
                    }}
                    sx={{
                      width: 70,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                        height: 32,
                      },
                      "& input": {
                        textAlign: "center",
                        p: 0.5,
                        fontSize: 12,
                      },
                    }}
                  />
                ) : (
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    -
                  </Typography>
                )}
              </Box>

              {/* Total Price */}
              <Box sx={{ textAlign: "right" }}>
                <Typography
                  sx={{ fontSize: 14, fontWeight: 700, color: "#ff6b35" }}
                >
                  {formatPrice(item.totalPrice)} so'm
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                  {formatPrice(item.unitPrice)} so'm/dp
                </Typography>
              </Box>

              {/* Delete Button */}
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <IconButton
                  size="small"
                  onClick={() => handleRemoveItem(item.id)}
                  sx={{ color: "text.secondary" }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
}
