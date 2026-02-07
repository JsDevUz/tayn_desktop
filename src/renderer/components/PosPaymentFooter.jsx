import { Box, Paper, Typography, Button, TextField } from "@mui/material";
import { useMemo, useState, useEffect, useRef } from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PaymentIcon from "@mui/icons-material/Payment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

function PaymentInputs({ totalAmount, onChangeUpdate, onPaidUpdate }) {
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  
  const cashRef = useRef(null);
  const cardRef = useRef(null);
  const onlineRef = useRef(null);

  // Calculate and report change
  const cash = parseInt(cashAmount) || 0;
  const card = parseInt(cardAmount) || 0;
  const online = parseInt(onlineAmount) || 0;
  const totalPaid = cash + card + online;
  const change = Math.max(0, totalPaid - totalAmount);

  useEffect(() => {
    onChangeUpdate(change);
    onPaidUpdate(totalPaid);
  }, [change, totalPaid, onChangeUpdate, onPaidUpdate]);

  const handleCashInput = (value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setCashAmount(numericValue);
  };

  const handleCardInput = (value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const newValue = parseInt(numericValue) || 0;
    const cashVal = parseInt(cashAmount) || 0;
    const onlineVal = parseInt(onlineAmount) || 0;
    
    const maxAllowed = Math.max(0, totalAmount - cashVal - onlineVal);
    if (newValue > maxAllowed) {
      setCardAmount(maxAllowed.toString());
    } else {
      setCardAmount(numericValue);
    }
  };

  const handleOnlineInput = (value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const newValue = parseInt(numericValue) || 0;
    const cashVal = parseInt(cashAmount) || 0;
    const cardVal = parseInt(cardAmount) || 0;
    
    const maxAllowed = Math.max(0, totalAmount - cashVal - cardVal);
    if (newValue > maxAllowed) {
      setOnlineAmount(maxAllowed.toString());
    } else {
      setOnlineAmount(numericValue);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const cashVal = parseInt(cashAmount) || 0;
      const cardVal = parseInt(cardAmount) || 0;
      const onlineVal = parseInt(onlineAmount) || 0;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCashAmount(totalAmount.toString());
        setTimeout(() => cashRef.current?.focus(), 0);
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        const remaining = Math.max(0, totalAmount - cashVal - onlineVal);
        setCardAmount(remaining.toString());
        setTimeout(() => cardRef.current?.focus(), 0);
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const remaining = Math.max(0, totalAmount - cashVal - cardVal);
        setOnlineAmount(remaining.toString());
        setTimeout(() => onlineRef.current?.focus(), 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cashAmount, cardAmount, onlineAmount, totalAmount]);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200 }}>
      {/* Cash Input */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        p: 1.5, 
        border: '2px solid #1976d2',
        borderRadius: '12px',
        bgcolor: 'background.paper'
      }}>
        <TextField
          inputRef={cashRef}
          value={cashAmount}
          onChange={(e) => handleCashInput(e.target.value)}
          placeholder="0"
          size="small"
          inputProps={{ inputMode: 'numeric' }}
          sx={{ 
            flex: 1,
            '& .MuiOutlinedInput-root': { 
              border: 'none',
              '& fieldset': { border: 'none' }
            },
            '& input': { 
              fontSize: 18, 
              fontWeight: 700,
              p: 0
            }
          }}
        />
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>so'm</Typography>
        <Box sx={{ 
          px: 1, 
          py: 0.5, 
          bgcolor: '#eee', 
          borderRadius: '4px', 
          fontSize: 11, 
          fontWeight: 600,
          cursor: 'pointer'
        }}
        onClick={() => {
          setCashAmount(totalAmount.toString());
          setTimeout(() => cashRef.current?.focus(), 0);
        }}
        >
          N
        </Box>
      </Box>

      {/* Card Amount */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        p: 1.5, 
        border: '1px solid #ddd',
        borderRadius: '12px',
        bgcolor: 'background.paper'
      }}>
        <TextField
          inputRef={cardRef}
          value={cardAmount}
          onChange={(e) => handleCardInput(e.target.value)}
          placeholder="0"
          size="small"
          inputProps={{ inputMode: 'numeric' }}
          sx={{ 
            flex: 1,
            '& .MuiOutlinedInput-root': { 
              border: 'none',
              '& fieldset': { border: 'none' }
            },
            '& input': { 
              fontSize: 18, 
              fontWeight: 700,
              p: 0
            }
          }}
        />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <CreditCardIcon fontSize="small" sx={{ color: '#4caf50' }} />
          <CreditCardIcon fontSize="small" sx={{ color: '#2196f3' }} />
          <PaymentIcon fontSize="small" sx={{ color: '#ff9800' }} />
        </Box>
        <Box sx={{ 
          px: 1, 
          py: 0.5, 
          bgcolor: '#eee', 
          borderRadius: '4px', 
          fontSize: 11, 
          fontWeight: 600,
          cursor: 'pointer'
        }}
        onClick={() => {
          const cashVal = parseInt(cashAmount) || 0;
          const onlineVal = parseInt(onlineAmount) || 0;
          const remaining = Math.max(0, totalAmount - cashVal - onlineVal);
          setCardAmount(remaining.toString());
          setTimeout(() => cardRef.current?.focus(), 0);
        }}
        >
          H
        </Box>
      </Box>

      {/* Online Payment with Input */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        p: 1.5, 
        border: '1px solid #ddd',
        borderRadius: '12px',
        bgcolor: 'background.paper'
      }}>
        <TextField
          inputRef={onlineRef}
          value={onlineAmount}
          onChange={(e) => handleOnlineInput(e.target.value)}
          placeholder="0"
          size="small"
          inputProps={{ inputMode: 'numeric' }}
          sx={{ 
            flex: 1,
            '& .MuiOutlinedInput-root': { 
              border: 'none',
              '& fieldset': { border: 'none' }
            },
            '& input': { 
              fontSize: 18, 
              fontWeight: 700,
              p: 0
            }
          }}
        />
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Online</Typography>
        <AccountBalanceWalletIcon fontSize="small" sx={{ color: '#9c27b0' }} />
        <Box sx={{ 
          px: 1, 
          py: 0.5, 
          bgcolor: '#eee', 
          borderRadius: '4px', 
          fontSize: 11, 
          fontWeight: 600,
          cursor: 'pointer'
        }}
        onClick={() => {
          const cashVal = parseInt(cashAmount) || 0;
          const cardVal = parseInt(cardAmount) || 0;
          const remaining = Math.max(0, totalAmount - cashVal - cardVal);
          setOnlineAmount(remaining.toString());
          setTimeout(() => onlineRef.current?.focus(), 0);
        }}
        >
          C
        </Box>
      </Box>
    </Box>
  );
}

function Totals({ cartItems, changeAmount, paidAmount }) {
  const rows = useMemo(() => {
    const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const remainingToPay = Math.max(0, totalAmount - paidAmount);
    
    // If there's change, show "Qaytim" instead of "To'lash kerak"
    if (changeAmount > 0) {
      return [
        { label: "Umumiy qiymat", value: `${totalAmount.toLocaleString()} so'm` },
        { label: "Chegirma", value: "0 so'm" },
        { label: "Qaytim", value: `${changeAmount.toLocaleString()} so'm`, strong: true, highlight: true },
      ];
    }
    
    return [
      { label: "Umumiy qiymat", value: `${totalAmount.toLocaleString()} so'm` },
      { label: "Chegirma", value: "0 so'm" },
      { label: "To'lash kerak", value: `${remainingToPay.toLocaleString()} so'm`, strong: true },
    ];
  }, [cartItems, changeAmount, paidAmount]);

  return (
    <Box sx={{ flex: 1, minWidth: 0, px: 2 }}>
      {rows.map((r) => (
        <Box
          key={r.label}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 0.75,
          }}
        >
          <Typography sx={{ 
            fontSize: 12, 
            color: r.highlight ? "#e65100" : "text.secondary",
            fontWeight: r.highlight ? 600 : 400
          }}>
            {r.label}
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: r.strong ? 700 : 600,
              color: r.highlight ? "#e65100" : "text.primary",
            }}
          >
            {r.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function PayCard({ cartItems, onOpenPaymentModal }) {
  const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200 }}>
      {/* Payment Button */}
      <Paper
        sx={{
          borderRadius: "12px",
          overflow: "hidden",
          bgcolor: "#ff6b35",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 11, color: "#fff", opacity: 0.8 }}>To'lov</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
              {totalAmount.toLocaleString()} so'm
            </Typography>
          </Box>
          <Box sx={{ 
            px: 1.5, 
            py: 0.5, 
            bgcolor: 'rgba(255,255,255,0.2)', 
            borderRadius: '6px',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600
          }}>
            F10
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5 }}>
        {/* Full Payment Button */}
      <Button
        variant="outlined"
        onClick={onOpenPaymentModal}
        disabled={cartItems.length === 0}
        sx={{
          height: 44,
          borderRadius: '10px',
          justifyContent: 'space-between',
          px: 2,
          textTransform: 'none',
          fontSize: 14,
          fontWeight: 600,
          borderColor: '#ddd',
          color: 'text.primary',
          '&:hover': { borderColor: '#1976d2', bgcolor: 'background.default' }
        }}
      >
        To'liq
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            px: 1, 
            py: 0.5, 
            bgcolor: '#eee', 
            borderRadius: '4px', 
            fontSize: 10, 
            fontWeight: 600 
          }}>
            F9
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ color: '#ff6b35' }} />
        </Box>
      </Button>

      {/* Draft Button */}
      <Button
        variant="outlined"
        sx={{
          height: 44,
          borderRadius: '10px',
          justifyContent: 'space-between',
          px: 2,
          textTransform: 'none',
          fontSize: 14,
          fontWeight: 600,
          borderColor: '#ddd',
          color: 'text.secondary',
        }}
      >
        Qoralama
        <CloseIcon fontSize="small" sx={{ color: '#f44336' }} />
      </Button>
      </Box>
    </Box>
  );
}

export default function PosPaymentFooter({ saleId, cartItems, onPaymentComplete, onOpenPaymentModal }) {
  const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const [changeAmount, setChangeAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  return (
    <Paper
      sx={{
        borderRadius: "16px",
        p: 2,
        display: "flex",
        alignItems: "stretch",
        gap: 2,
        bgcolor: 'action.hover'
      }}
    >
      <PaymentInputs totalAmount={totalAmount} onChangeUpdate={setChangeAmount} onPaidUpdate={setPaidAmount} />
      <Totals cartItems={cartItems} changeAmount={changeAmount} paidAmount={paidAmount} />
      <PayCard 
        cartItems={cartItems} 
        onOpenPaymentModal={onOpenPaymentModal}
      />
    </Paper>
  );
}
