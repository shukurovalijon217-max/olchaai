/*
  NEXUS Core Admin Routes
  - GET  /api/admin/nexus/health   — system health + circuit breakers
  - GET  /api/admin/nexus/traffic  — hourly traffic intelligence
  - POST /api/admin/nexus/reset    — manually reset a circuit breaker
  - GET  /api/admin/nexus/healing  — self-healing event log
*/
import { Router } from "express";
import { systemMonitor } from "../lib/systemMonitor";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!req.session?.isAdmin) { res.status(403).json({ error: "Admin required" }); return; }
  next();
}

router.get("/admin/nexus/health", requireAdmin, (_req, res) => {
  res.json(systemMonitor.health());
});

router.get("/admin/nexus/traffic", requireAdmin, (_req, res) => {
  res.json(systemMonitor.traffic());
});

router.get("/admin/nexus/healing", requireAdmin, (_req, res) => {
  const h = systemMonitor.health();
  res.json({ events: h.healingEvents });
});

router.post("/admin/nexus/reset", requireAdmin, (req, res) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) { res.status(400).json({ error: "endpoint required" }); return; }
  systemMonitor.resetCircuit(endpoint);
  res.json({ ok: true, message: `Circuit reset for: ${endpoint}` });
});

export default router;
