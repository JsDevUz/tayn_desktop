import {
  Box,
  Divider,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
  TextField,
  Switch,
  IconButton,
  Button,
} from "@mui/material";
import { useState } from "react";
import DraftsDrawer from "./DraftsDrawer";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DraftsOutlinedIcon from "@mui/icons-material/DraftsOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import KeyboardIcon from "@mui/icons-material/Keyboard";

function SidebarAction({ icon, title, badge, onClick, disabled }) {
  return (
    <Box
      onClick={!disabled ? onClick : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 1.5,
        px: 1.5,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        "&:hover": disabled ? {} : { bgcolor: "action.hover" },
        borderRadius: "10px",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {icon}
        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{title}</Typography>
      </Box>
      {badge && (
        <Box
          sx={{
            bgcolor: "#ff6b35",
            color: "#fff",
            borderRadius: "50%",
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {badge}
        </Box>
      )}
      <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary" }} />
    </Box>
  );
}

function BonusCard() {
  return (
    <Box
      sx={{
        borderRadius: "12px",
        background: "linear-gradient(135deg, #ff9800 0%, #ff6b35 100%)",
        color: "#fff",
        px: 2,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            bgcolor: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShoppingCartIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
            +5 000 so'm
          </Typography>
          <Typography sx={{ fontSize: 11, opacity: 0.8 }}>
            Mening bonusom
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function PosSidebar({
  onNewTab,
  canAddTab = true,
  onRestoreSale,
  saleCode,
  openTabSaleIds = [],
}) {
  const [epos, setEpos] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientType, setClientType] = useState("other");
  const [draftsDrawerOpen, setDraftsDrawerOpen] = useState(false);

  return (
    <Paper
      sx={{
        height: "100%",
        borderRadius: "16px",
        p: 2,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Sale Code */}
      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
        ID: <span style={{ fontWeight: 700 }}>#{saleCode || "-------"}</span>
      </Typography>

      {/* Actions */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <SidebarAction
          icon={
            <OpenInNewIcon fontSize="small" sx={{ color: "text.secondary" }} />
          }
          title="Yangi savdo oynasida ochish"
          onClick={onNewTab}
          disabled={!canAddTab}
        />
        <SidebarAction
          icon={
            <DraftsOutlinedIcon
              fontSize="small"
              sx={{ color: "text.secondary" }}
            />
          }
          title="Qoralamalar / Kechiktirilgan"
          onClick={() => setDraftsDrawerOpen(true)}
        />
        <SidebarAction
          icon={
            <BlockOutlinedIcon
              fontSize="small"
              sx={{ color: "text.secondary" }}
            />
          }
          title="Rad etilgan mahsulotlar"
        />
        <SidebarAction
          icon={
            <ReplayIcon fontSize="small" sx={{ color: "text.secondary" }} />
          }
          title="Qaytarish"
        />
      </Box>

      {/* EPOS Toggle */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 1,
          mt: 1,
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>EPOS</Typography>
        <Switch
          checked={epos}
          onChange={(e) => setEpos(e.target.checked)}
          size="small"
          color="warning"
        />
      </Box>

      {/* Online Sales */}
      <SidebarAction
        icon={
          <ShoppingCartIcon fontSize="small" sx={{ color: "text.secondary" }} />
        }
        title="Online-sotuvlar (Noor)"
        badge="1"
      />

      <Divider sx={{ my: 1.5 }} />

      {/* Client Section */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Mijoz</Typography>
          <Button
            size="small"
            sx={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "none",
              color: "primary.main",
            }}
          >
            Yaratish
          </Button>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1.5,
            border: "1px solid #ddd",
            borderRadius: "10px",
            bgcolor: "action.hover",
            mb: 2,
          }}
        >
          <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
          <TextField
            fullWidth
            size="small"
            placeholder="Mijoz nomini kiriting"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                border: "none",
                "& fieldset": { border: "none" },
              },
              "& input": { p: 0, fontSize: 13 },
            }}
          />
          <Box
            sx={{
              bgcolor: "#00bcd4",
              color: "#fff",
              borderRadius: "6px",
              px: 1,
              py: 0.5,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            F3
          </Box>
        </Box>

        <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>
          Yangi mijoz
        </Typography>

        <RadioGroup
          row
          value={clientType}
          onChange={(e) => setClientType(e.target.value)}
        >
          <FormControlLabel
            value="other"
            control={<Radio size="small" />}
            label={<Typography sx={{ fontSize: 12 }}>Boshqa</Typography>}
          />
          <FormControlLabel
            value="arzon"
            control={<Radio size="small" />}
            label={<Typography sx={{ fontSize: 12 }}>Arzon Apt</Typography>}
          />
          <FormControlLabel
            value="oson"
            control={<Radio size="small" />}
            label={<Typography sx={{ fontSize: 12 }}>Oson Apt</Typography>}
          />
        </RadioGroup>
      </Box>

      {/* Bonus Card */}
      <Box sx={{ mt: 2 }}>
        <BonusCard />
      </Box>

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Shortcuts Button */}
      <Button
        variant="contained"
        startIcon={<KeyboardIcon />}
        sx={{
          mt: 2,
          borderRadius: "10px",
          textTransform: "none",
          bgcolor: "#1a1a2e",
          "&:hover": { bgcolor: "#0f0f1a" },
        }}
      >
        Shortkatlar
      </Button>

      {/* Drafts Drawer */}
      <DraftsDrawer
        open={draftsDrawerOpen}
        onClose={() => setDraftsDrawerOpen(false)}
        onRestoreSale={onRestoreSale}
        canRestoreSale={canAddTab}
        openTabSaleIds={openTabSaleIds}
      />
    </Paper>
  );
}
