import { createApp } from "./app";
import { loadEnv, resolveDataFile } from "./schemas";
import { buildSeedTransactions } from "./seed";
import { createStore } from "./store";

const env = loadEnv();
const filePath = resolveDataFile(env.DATA_FILE);
const store = createStore({
  filePath,
  seed: buildSeedTransactions(),
});
const app = createApp(store, { allowFutureDates: env.ALLOW_FUTURE_DATES });

app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});
