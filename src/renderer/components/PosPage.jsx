import {
  Box,
  Typography,
  IconButton,
  useTheme,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import { useState, useEffect } from "react";
import PosCartPanel from "./PosCartPanel";
import PosPaymentFooter from "./PosPaymentFooter";
import PosSearchBar from "./PosSearchBar";
import PosSidebar from "./PosSidebar";
import PaymentModal from "./PaymentModal";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import { checkInternetConnection } from "../utils/network";

const MAX_TABS = 4;
const TABS_STORAGE_KEY = "pos_tabs";
const ACTIVE_TAB_STORAGE_KEY = "pos_active_tab";

const PosPage = () => {
  // Multi-tab state: each tab has { id, saleId, cartItems }
  const [tabs, setTabs] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [closeConfirmDialog, setCloseConfirmDialog] = useState({
    open: false,
    tabIndex: null,
    saleId: null,
  });

  // Load tabs from localStorage on mount
  useEffect(() => {
    const loadSavedTabs = async () => {
      try {
        const savedTabs = localStorage.getItem(TABS_STORAGE_KEY);
        const savedActiveIndex = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);

        if (savedTabs) {
          const parsedTabs = JSON.parse(savedTabs);
          if (parsedTabs.length > 0) {
            setTabs(parsedTabs);
            setActiveTabIndex(
              savedActiveIndex ? parseInt(savedActiveIndex, 10) : 0,
            );
            setIsInitialized(true);
            return;
          }
        }

        // No saved tabs, create first tab
        await createFirstTab();
      } catch (error) {
        console.error("Error loading saved tabs:", error);
        await createFirstTab();
      }
    };

    loadSavedTabs();
  }, []);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (isInitialized && tabs.length > 0) {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabIndex.toString());
    }
  }, [tabs, activeTabIndex, isInitialized]);

  // Online status check
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const checkStatus = async () => {
      const online = await checkInternetConnection();
      setIsOnline(online);
    };

    // Check immediately
    checkStatus();

    // Check every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const createNewSale = async () => {
    try {
      const saleId = crypto.randomUUID
        ? crypto.randomUUID()
        : "SALE-" + Date.now();
      const storeId =
        localStorage.getItem("selected_store_id") || crypto.randomUUID();
      const cashierId = crypto.randomUUID
        ? crypto.randomUUID()
        : "CASHIER-" + Date.now();

      // Generate unique 7-digit sale code
      const saleCode = Math.floor(1000000 + Math.random() * 9000000).toString();

      const result = await window.electronAPI.db.query(
        `
        INSERT INTO sales (
          id, store_id, cashier_id, total_amount, final_amount, status, event_type, sale_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [saleId, storeId, cashierId, 0, 0, "draft", "sale", saleCode],
      );

      if (result.success) {
        return { saleId, saleCode };
      }
      return null;
    } catch (error) {
      console.error("Error creating new sale:", error);
      return null;
    }
  };

  const createFirstTab = async () => {
    const result = await createNewSale();
    if (result) {
      const newTab = {
        id: Date.now(),
        saleId: result.saleId,
        saleCode: result.saleCode,
        cartItems: [],
        name: "Savdo 1",
      };
      setTabs([newTab]);
      setActiveTabIndex(0);
      setIsInitialized(true);
    }
  };

  const createNewTab = async () => {
    if (tabs.length >= MAX_TABS) {
      console.log("Maximum tabs reached");
      return;
    }

    const result = await createNewSale();
    if (result) {
      const newTab = {
        id: Date.now(),
        saleId: result.saleId,
        saleCode: result.saleCode,
        cartItems: [],
        name: `Savdo ${tabs.length + 1}`,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabIndex(tabs.length);
    }
  };

  const restoreSale = (saleId, saleCode, cartItems) => {
    console.log("restoreSale called with:", {
      saleId,
      saleCode,
      cartItems,
      tabsLength: tabs.length,
    });

    // Check if this sale is already open in a tab
    const existingTabIndex = tabs.findIndex((tab) => tab.saleId === saleId);
    if (existingTabIndex !== -1) {
      console.log("Sale already open in tab", existingTabIndex);
      setActiveTabIndex(existingTabIndex);
      return;
    }

    if (tabs.length >= MAX_TABS) {
      console.log("Cannot restore - Maximum tabs reached");
      return;
    }

    const newTab = {
      id: Date.now(),
      saleId: saleId,
      saleCode: saleCode,
      cartItems: cartItems || [],
      name: `Savdo ${tabs.length + 1}`,
    };

    console.log("Creating new tab:", newTab);

    setTabs((prev) => {
      const newTabs = [...prev, newTab];
      // Set active tab to the new one
      setActiveTabIndex(newTabs.length - 1);
      return newTabs;
    });
  };

  const closeTab = (index, e) => {
    e.stopPropagation();
    const tab = tabs[index];

    // Show confirmation dialog
    setCloseConfirmDialog({
      open: true,
      tabIndex: index,
      saleId: tab?.saleId,
      hasItems: tab?.cartItems?.length > 0,
    });
  };

  const handleCloseConfirm = async (shouldDelete) => {
    const { tabIndex, saleId } = closeConfirmDialog;

    if (shouldDelete && saleId) {
      try {
        // Delete sale items first
        await window.electronAPI.db.query(
          "DELETE FROM sale_items WHERE sale_id = ?",
          [saleId],
        );
        // Delete the sale
        await window.electronAPI.db.query(
          "DELETE FROM sales WHERE id = ? AND status != ?",
          [saleId, "completed"],
        );
        console.log("Sale deleted:", saleId);
      } catch (error) {
        console.error("Error deleting sale:", error);
      }
    }

    // Close the tab
    if (tabs.length === 1) {
      // If last tab, create new one first
      const result = await createNewSale();
      if (result) {
        setTabs([
          {
            id: Date.now(),
            saleId: result.saleId,
            saleCode: result.saleCode,
            cartItems: [],
            name: "Savdo 1",
          },
        ]);
        setActiveTabIndex(0);
      }
    } else {
      setTabs((prev) => prev.filter((_, i) => i !== tabIndex));
      // Adjust active tab index
      if (activeTabIndex >= tabIndex && activeTabIndex > 0) {
        setActiveTabIndex(activeTabIndex - 1);
      }
    }

    setCloseConfirmDialog({ open: false, tabIndex: null, saleId: null });
  };

  const handleCloseCancel = () => {
    setCloseConfirmDialog({ open: false, tabIndex: null, saleId: null });
  };

  const currentTab = tabs[activeTabIndex] || { saleId: null, cartItems: [] };

  const setCurrentCartItems = (updater) => {
    setTabs((prev) =>
      prev.map((tab, i) => {
        if (i === activeTabIndex) {
          const newCartItems =
            typeof updater === "function" ? updater(tab.cartItems) : updater;
          return { ...tab, cartItems: newCartItems };
        }
        return tab;
      }),
    );
  };

  const handleProductSelect = async (product) => {
    if (!currentTab.saleId) return;

    try {
      const existingItem = currentTab.cartItems.find(
        (item) => item.product.id === product.id,
      );

      if (existingItem) {
        setCurrentCartItems((prev) =>
          prev.map((item) => {
            if (item.product.id === product.id) {
              const newQuantity = item.quantity + 1;
              const newTotalPrice = newQuantity * item.unitPrice;

              // Update DB
              window.electronAPI.db
                .query(
                  `UPDATE sale_items SET quantity = ?, total_price = ?, is_sync = false WHERE id = ?`,
                  [newQuantity, newTotalPrice, item.id],
                )
                .catch((err) =>
                  console.error("Failed to update sale item quantity:", err),
                );

              return {
                ...item,
                quantity: newQuantity,
                totalPrice: newTotalPrice,
              };
            }
            return item;
          }),
        );
        return;
      }

      const saleItemId = crypto.randomUUID
        ? crypto.randomUUID()
        : "ITEM-" + Date.now();

      const stock = product.stock_quantity || 0;
      // Default to 1, but if stock < 1, allow max available (e.g. 0.9)
      // If stock is 0, we shouldn't add? Or let user handle it.
      // But typically we add 1.
      let initialQuantity = 1;

      if (product.can_split && product.packaging?.unitsPerPack > 1) {
        // If stock is less than 1 pack, use the exact stock quantity (e.g. 0.5)
        if (stock > 0 && stock < 1) {
          initialQuantity = stock;
        }
      }

      // Also validate against stock for non-split items if needed?
      // Usually non-split items act as integers. If stock is 0, we might block or allow negative (backorder).
      // Assuming no backorder for now given the strict validation requested.
      if (stock > 0 && initialQuantity > stock && !product.can_split) {
        initialQuantity = stock;
      }

      const result = await window.electronAPI.db.query(
        `
        INSERT INTO sale_items (
          id, sale_id, product_id, quantity, unit_price, total_price, is_sync
        ) VALUES (?, ?, ?, ?, ?, ?, false)
      `,
        [
          saleItemId,
          currentTab.saleId,
          product.server_id || product.id,
          initialQuantity,
          parseFloat(product.price) || 0,
          (parseFloat(product.price) || 0) * initialQuantity,
        ],
      );

      if (result.success) {
        setCurrentCartItems((prev) => [
          ...prev,
          {
            id: saleItemId,
            product: product,
            quantity: initialQuantity,
            unitPrice: parseFloat(product.price) || 0,
            totalPrice: (parseFloat(product.price) || 0) * initialQuantity,
          },
        ]);
      }
    } catch (error) {
      console.error("Error adding product to cart:", error);
    }
  };

  const handlePaymentComplete = async () => {
    setPaymentModalOpen(false);

    // Reset current tab's cart
    setCurrentCartItems([]);

    // Create new sale for this tab
    // Create new sale for this tab
    const result = await createNewSale();
    setTabs((prev) =>
      prev.map((tab, i) => {
        if (i === activeTabIndex) {
          return {
            ...tab,
            saleId: result?.saleId,
            saleCode: result?.saleCode,
            cartItems: [],
          };
        }
        return tab;
      }),
    );
  };

  const handleRefresh = async () => {
    const isOnline = await checkInternetConnection();
    if (!isOnline) {
      alert("Internet yo'q! Offline rejimda dasturni yangilab bo'lmaydi.");
      return;
    }
    window.location.reload();
  };

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Chrome-like Tabs - positioned after macOS traffic lights */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          pl: "80px", // Space for macOS traffic lights
          pr: 2,
          pt: 1,
          pb: 0,
          bgcolor: isDark ? "background.paper" : "#e8e8e8",
          borderBottom: "1px solid",
          borderColor: "divider",
          gap: 0.5,
          WebkitAppRegion: "drag", // Make draggable like Chrome
        }}
      >
        {tabs.map((tab, index) => (
          <Box
            key={tab.id}
            onClick={() => setActiveTabIndex(index)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1,
              minWidth: 120,
              maxWidth: 200,
              bgcolor:
                activeTabIndex === index
                  ? "background.paper"
                  : isDark
                    ? "action.hover"
                    : "#ddd",
              borderTopLeftRadius: "10px",
              borderTopRightRadius: "10px",
              cursor: "pointer",
              position: "relative",
              boxShadow:
                activeTabIndex === index
                  ? "0 -1px 4px rgba(0,0,0,0.1)"
                  : "none",
              transition: "all 0.15s",
              WebkitAppRegion: "no-drag",
              "&:hover": {
                bgcolor:
                  activeTabIndex === index
                    ? "background.paper"
                    : isDark
                      ? "action.selected"
                      : "#e0e0e0",
              },
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: activeTabIndex === index ? 600 : 500,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: activeTabIndex === index ? "#1a1a2e" : "text.secondary",
              }}
            >
              {tab.name}
              {tab.cartItems.length > 0 && (
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    bgcolor: "#ff6b35",
                    color: "#fff",
                    px: 0.8,
                    py: 0.2,
                    borderRadius: "8px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {tab.cartItems.length}
                </Box>
              )}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => closeTab(index, e)}
              sx={{
                p: 0.3,
                "&:hover": { bgcolor: "rgba(0,0,0,0.1)" },
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        ))}

        {/* New Tab Button */}
        {tabs.length < MAX_TABS && (
          <IconButton
            onClick={createNewTab}
            sx={{
              mb: 0.5,
              bgcolor: isDark ? "action.hover" : "#ddd",
              borderRadius: "8px",
              width: 32,
              height: 32,
              WebkitAppRegion: "no-drag",
              "&:hover": { bgcolor: isDark ? "action.selected" : "#ccc" },
            }}
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}

        {/* Online Status Indicator */}
        <Box
          sx={{
            ml: "auto",
            mb: 0.5,
            mr: 1,
            display: "flex",
            alignItems: "center",
            WebkitAppRegion: "no-drag",
          }}
        >
          <Tooltip
            title={
              isOnline ? "Online (Serverga ulangan)" : "Offline (Internet yo'q)"
            }
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: "8px",
                bgcolor: isOnline
                  ? "rgba(76, 175, 80, 0.1)"
                  : "rgba(244, 67, 54, 0.1)",
                border: "1px solid",
                borderColor: isOnline ? "success.main" : "error.main",
              }}
            >
              {isOnline ? (
                <WifiIcon sx={{ fontSize: 18, color: "success.main" }} />
              ) : (
                <WifiOffIcon sx={{ fontSize: 18, color: "error.main" }} />
              )}
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isOnline ? "success.main" : "error.main",
                }}
              >
                {isOnline ? "Online" : "Offline"}
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: "flex", gap: 2, p: 2, overflow: "hidden" }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <PosSearchBar
            onProductSelect={handleProductSelect}
            cartItemsCount={currentTab.cartItems.length}
            onRefresh={handleRefresh}
          />

          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
            <PosCartPanel
              saleId={currentTab.saleId}
              cartItems={currentTab.cartItems}
              setCartItems={setCurrentCartItems}
            />
          </Box>

          <PosPaymentFooter
            saleId={currentTab.saleId}
            cartItems={currentTab.cartItems}
            onPaymentComplete={handlePaymentComplete}
            onOpenPaymentModal={() => setPaymentModalOpen(true)}
          />
        </Box>

        {/* Sidebar */}
        <Box sx={{ width: 320, minWidth: 320, maxWidth: 320, height: "100%" }}>
          <PosSidebar
            onNewTab={createNewTab}
            canAddTab={tabs.length < MAX_TABS}
            onRestoreSale={restoreSale}
            saleCode={currentTab.saleCode}
            openTabSaleIds={tabs.map((t) => t.saleId)}
          />
        </Box>
      </Box>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        saleId={currentTab.saleId}
        cartItems={currentTab.cartItems}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Close Tab Confirmation Dialog */}
      <Dialog
        open={closeConfirmDialog.open}
        onClose={handleCloseCancel}
        PaperProps={{
          sx: { borderRadius: "16px", minWidth: 320 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Savdoni o'chirmoqchimisiz?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "text.secondary" }}>
            {closeConfirmDialog.hasItems
              ? "Bu savdo va unga tegishli barcha mahsulotlar o'chiriladi."
              : "Bo'sh savdo o'chiriladi."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseCancel} sx={{ textTransform: "none" }}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => handleCloseConfirm(true)}
            variant="contained"
            color="error"
            sx={{ textTransform: "none", borderRadius: "8px" }}
          >
            Ha, o'chirish
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PosPage;
