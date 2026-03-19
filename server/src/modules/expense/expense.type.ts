export const expenseTypeDefs = `#graphql
  type Expense {
    id: ID!
    groupId: String
    createdById: String!
    totalAmount: Float!
    currency: String!
    note: String
    createdAt: String!
    shares: [ExpenseShare!]!
    createdBy: User!
    attachments: [ExpenseAttachment!]!
    group: Group
  }

  type ExpenseShare {
    id: ID!
    expenseId: String!
    userId: String!
    shareAmount: Float!
    paidAmount: Float!
    status: String!
    user: User!
    expense: Expense!
  }

  type ExpenseAttachment {
    id: ID!
    expenseId: String!
    uploadedBy: String!
    url: String!
    filename: String
    contentType: String
    createdAt: String!
  }

  type Settlement {
    id: ID!
    fromUserId: String!
    toUserId: String!
    amount: Float!
    currency: String!
    status: String!
    paymentMethodId: String
    groupId: String
    createdAt: String!
  }

  type LedgerTransaction {
    id: ID!
    userId: String!
    counterpartyUserId: String
    expenseId: String
    settlementId: String
    groupId: String
    type: String!
    direction: String!
    amount: Float!
    currency: String!
    note: String
    paymentMethodId: String
    createdAt: String!
  }

  type UserBalance {
    userId: String!
    userName: String!
    amount: Float!
  }

  type BalanceSummary {
    totalOwe: Float!
    totalOwed: Float!
    oweList: [UserBalance!]!
    owedList: [UserBalance!]!
  }

  extend type Query {
    getGroupExpenses(groupId: String!): [Expense!]!
    getRecentActivities: [Expense!]!
    getMyBalances: BalanceSummary!
    getExpenseDetail(expenseId: String!): Expense!
    getUserUnsettledShares(toUserId: String!, groupId: String): [ExpenseShare!]!
    getMyTransactions(relatedUserId: String, type: String, limit: Int, offset: Int): [LedgerTransaction!]!
  }

  extend type Mutation {
    createExpense(groupId: String!, description: String!, amount: Float!, participants: [String!]!): Expense!
    settleExpense(toUserId: String!, amount: Float!, paymentMode: String!, groupId: String): Settlement!
    settleSpecificShares(shareIds: [String!]!, amount: Float!, paymentMode: String!, groupId: String): Settlement!
  }
`;
