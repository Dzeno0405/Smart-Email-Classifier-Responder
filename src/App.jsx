import { useMemo, useState } from "react";
import axios from "axios";
import {
  Box, Container, Typography, TextField, Button, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Stack, Divider,
  Alert
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import SellIcon from "@mui/icons-material/Sell";
import FeedbackIcon from "@mui/icons-material/Feedback";
import BoltIcon from "@mui/icons-material/Bolt";

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/+$/, "");

function categoryChip(category) {
  const map = {
    Support: { label: "Support", color: "primary", icon: <SupportAgentIcon fontSize="small" /> },
    Sales: { label: "Sales", color: "success", icon: <SellIcon fontSize="small" /> },
    Feedback: { label: "Feedback", color: "warning", icon: <FeedbackIcon fontSize="small" /> },
  };
  const cfg = map[category] || { label: category || "Unknown", color: "default" };
  return <Chip size="small" color={cfg.color} icon={cfg.icon} label={cfg.label} />;
}

export default function App() {
  const [rawInput, setRawInput] = useState(
    "Hi, I want to know about your premium subscription plans.\n\n" +
    "My package arrived damaged and I need a replacement.\n\n" +
    "Do you offer discounts for teams or bulk purchases?\n\n" +
    "I like the new update, but the interface is confusing."
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pingMsg, setPingMsg] = useState("");
  const [rates, setRates] = useState({
    classifyPerEmail: 0.001,
    generatePerEmail: 0.002,
  });

  const emails = useMemo(() => {
    return rawInput
      .split(/\n{2,}|\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }, [rawInput]);

  const totalCost = useMemo(() => {
    const n = rows.length;
    return (n * (rates.classifyPerEmail + rates.generatePerEmail)).toFixed(4);
  }, [rows, rates]);

  async function classifyAll() {
    if (!API_BASE) {
      alert("Missing VITE_API_BASE in .env");
      return;
    }
    if (emails.length === 0) {
      alert("Please paste at least one email.");
      return;
    }
    setLoading(true);
    setRows([]);

    try {
      const results = [];
      for (const email of emails) {
        const res = await axios.post(`${API_BASE}/classify`, { email });
        results.push(res.data);
      }
      setRows(results);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Request failed. Check ngrok URL & CORS.");
    } finally {
      setLoading(false);
    }
  }

  async function pingApi() {
    setPingMsg("");
    try {
      const res = await axios.get(`${API_BASE}/healthz`);
      setPingMsg(`OK: ${JSON.stringify(res.data)}`);
    } catch (e) {
      setPingMsg(`Failed: ${e?.message || "unknown error"}`);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
      
      {/* LOGO */}
      <Box sx={{ textAlign: "center" }}>
        <img src="/logo.png" alt="Logo" style={{ maxWidth: "200px", height: "auto" }} />
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1.2fr" },
          gap: 3,
        }}
      >
        {/* LEFT: Input & Controls */}
        <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700}>
              Smart Email Classifier & Responder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Paste one or many emails (separate by blank lines). The app will call your FastAPI+ngrok backend.
            </Typography>

            <TextField
              label="Emails"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              multiline
              minRows={12}
              fullWidth
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="contained"
                startIcon={<BoltIcon />}
                onClick={classifyAll}
                disabled={loading}
              >
                {loading ? "Classifying..." : `Classify ${emails.length || ""}`}
              </Button>

              <Button variant="outlined" onClick={pingApi}>
                Ping API
              </Button>
              <Typography variant="caption" sx={{ ml: 1 }}>
                API: {API_BASE || "(not set)"}
              </Typography>
            </Stack>

            {pingMsg && (
              <Alert severity={pingMsg.startsWith("OK") ? "success" : "error"}>
                {pingMsg}
              </Alert>
            )}

            <Divider />

            <Typography variant="subtitle2" color="text.secondary">
              Cost Estimator (editable)
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Classify $/email"
                type="number"
                value={rates.classifyPerEmail}
                onChange={(e) => setRates(r => ({ ...r, classifyPerEmail: parseFloat(e.target.value || 0) }))}
                size="small"
                inputProps={{ step: "0.001", min: "0" }}
              />
              <TextField
                label="Generate $/email"
                type="number"
                value={rates.generatePerEmail}
                onChange={(e) => setRates(r => ({ ...r, generatePerEmail: parseFloat(e.target.value || 0) }))}
                size="small"
                inputProps={{ step: "0.001", min: "0" }}
              />
              <Chip label={`Est. total: $${totalCost}`} color="info" />
            </Stack>
          </Stack>
        </Paper>

        {/* RIGHT: Results */}
        <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Results
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 180 }}>Category</TableCell>
                  <TableCell sx={{ width: "45%" }}>Auto Response</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{categoryChip(r.category)}</TableCell>
                    <TableCell>{r.auto_response}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {r.email}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary" align="center">
                        No results yet. Paste emails and click “Classify”.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Container>
  );
}
