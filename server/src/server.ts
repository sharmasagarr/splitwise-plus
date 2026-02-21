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

export async function startServer() {
  const app = express();
  app.use(passport.initialize());
  app.use("/auth", authRoutes);
  app.use("/", (_req, res) => res.json({ status: "OK" }));
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await apolloServer.start();

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(apolloServer, {
      context: buildContext,
    })
  );

  return { app, httpServer };
}