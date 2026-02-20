import express from "express";
import passport from "passport";
import http from "node:http";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@as-integrations/express5";
import { buildContext } from "./context";
import { typeDefs, resolvers } from "./schema";
import "./modules/auth/passport";
import authRoutes from "./modules/auth/auth.routes";

export async function startServer() {
  const app = express();
  app.use(passport.initialize());
  // app.use("/", (_req, res) => res.json({ status: "OK" }));
  app.use("/auth", authRoutes);
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