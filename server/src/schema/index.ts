import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { baseTypeDefs } from "./base";
import { userTypeDefs } from "../modules/user/user.type";
import { userResolvers } from "../modules/user/user.resolver";
import { authTypeDefs } from "../modules/auth/auth.type";
import { authResolvers } from "../modules/auth/auth.resolver";

export const typeDefs = mergeTypeDefs([
    baseTypeDefs,   
    userTypeDefs,
    authTypeDefs,
]);

export const resolvers = mergeResolvers([
    userResolvers,
    authResolvers,
]);
