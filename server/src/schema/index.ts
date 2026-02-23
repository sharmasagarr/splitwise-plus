import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { baseTypeDefs } from "./base.js";
import { userTypeDefs } from "../modules/user/user.type.js";
import { userResolvers } from "../modules/user/user.resolver.js";
import { authTypeDefs } from "../modules/auth/auth.type.js";
import { authResolvers } from "../modules/auth/auth.resolver.js";
import { groupTypeDefs } from "../modules/group/group.type.js";
import { groupResolvers } from "../modules/group/group.resolver.js";
import { expenseTypeDefs } from "../modules/expense/expense.type.js";
import { expenseResolvers } from "../modules/expense/expense.resolver.js";
import { messageTypeDefs } from "../modules/message/message.type.js";
import { messageResolvers } from "../modules/message/message.resolver.js";

export const typeDefs = mergeTypeDefs([
  baseTypeDefs,
  userTypeDefs,
  authTypeDefs,
  groupTypeDefs,
  expenseTypeDefs,
  messageTypeDefs,
]);

export const resolvers = mergeResolvers([
  userResolvers,
  authResolvers,
  groupResolvers,
  expenseResolvers,
  messageResolvers,
]);
