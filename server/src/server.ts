import express from "express";
import passport from "passport";
import http from "node:http";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@as-integrations/express5";
import { buildContext } from "./context/index.js";
import { typeDefs, resolvers } from "./schema/index.js";
import "./modules/auth/passport.js";
import authRoutes from "./modules/auth/auth.routes.js";
import expenseUploadRoutes from "./modules/expense/upload.routes.js";
import userUploadRoutes from "./modules/user/upload.routes.js";

export async function startServer() {
  const app = express();
  
  // Global middleware
  app.use(cors<cors.CorsRequest>({ credentials: true }));
  app.use(passport.initialize());
  
  // Routes
  app.use("/auth", authRoutes);
  app.use("/api/upload", expenseUploadRoutes);
  app.use("/api/upload", userUploadRoutes);
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await apolloServer.start();

  app.use(
    "/graphql",
    cors<cors.CorsRequest>({ credentials: true }),
    express.json(),
    expressMiddleware(apolloServer, {
      context: buildContext,
    }),
  );

  return { app, httpServer };
}
