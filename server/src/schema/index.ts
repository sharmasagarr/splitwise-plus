import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { baseTypeDefs } from "./base.js";
import { userTypeDefs } from "../modules/user/user.type.js";
import { userResolvers } from "../modules/user/user.resolver.js";
import { authTypeDefs } from "../modules/auth/auth.type.js";
import { authResolvers } from "../modules/auth/auth.resolver.js";

export const typeDefs = mergeTypeDefs([
    baseTypeDefs,   
    userTypeDefs,
    authTypeDefs,
]);

export const resolvers = mergeResolvers([
    userResolvers,
    authResolvers,
]);
