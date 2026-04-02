const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { createApp } = require("./src/app");
const { connectDb } = require("./src/db");

async function main() {
  await connectDb();
  const app = createApp();
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`[mock-api] listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error("[mock-api] failed to start", error);
  process.exitCode = 1;
});
