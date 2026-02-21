import { startServer } from "./server.js";

const PORT = process.env.PORT || 3500;

try {
  const { httpServer } = await startServer();

  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL ready at http://localhost:${PORT}/graphql`);
  });
} catch (err) {
  console.error("❌ Failed to start server", err);
  process.exit(1);
}
