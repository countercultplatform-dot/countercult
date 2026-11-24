import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import weeklyExchangeJournalRouter from "./routes/weeklyExchangeJournal";
import { studioPageAccessGate } from "./routes/studioAccess";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

const legacySketchyPrefix = "/sketchy-shona-studio-os";
const currentSketchyPrefix = "/sketchyshona";
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  const queryStart = req.originalUrl.indexOf("?");
  const requestPath = queryStart === -1 ? req.originalUrl : req.originalUrl.slice(0, queryStart);
  if (requestPath !== legacySketchyPrefix && !requestPath.startsWith(`${legacySketchyPrefix}/`)) {
    return next();
  }

  const suffix = requestPath.slice(legacySketchyPrefix.length);
  const isLegacyStudioRoute = suffix === "/os" || suffix.startsWith("/os/");
  const canonicalSuffix = isLegacyStudioRoute
    ? "/"
    : suffix === ""
      ? "/"
      : suffix.endsWith("/")
        ? suffix
        : `${suffix}/`;
  const query = queryStart === -1 ? "" : req.originalUrl.slice(queryStart);
  return res.redirect(301, `https://countercult.network${currentSketchyPrefix}${canonicalSuffix}${query}`);
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(weeklyExchangeJournalRouter);
app.use(studioPageAccessGate);
app.use("/api", router);

export default app;
