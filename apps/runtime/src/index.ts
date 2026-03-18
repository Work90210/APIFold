import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

const app: Express = express();
const port = process.env["RUNTIME_PORT"] ?? 3001;

app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Only start listening when this file is the entry point, not when imported by tests
if (process.argv[1] === new URL(import.meta.url).pathname) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Runtime server listening on port ${port}`);
  });
}

export { app };
