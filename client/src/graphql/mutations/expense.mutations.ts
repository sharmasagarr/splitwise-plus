import { gql } from '@apollo/client';

export const CREATE_EXPENSE = gql`
  mutation CreateExpense(
    $groupId: String!
    $description: String!
    $amount: Float!
    $participants: [String!]!
    $shareAmounts: [Float!]
  ) {
    createExpense(
      groupId: $groupId
      description: $description
      amount: $amount
      participants: $participants
      shareAmounts: $shareAmounts
    ) {
      id
      totalAmount
    }
  }
`;

export const SETTLE_EXPENSE = gql`
  mutation SettleExpense(
    $toUserId: String!
    $amount: Float!
    $paymentMode: String!
    $groupId: String
  ) {
    settleExpense(
      toUserId: $toUserId
      amount: $amount
      paymentMode: $paymentMode
      groupId: $groupId
    ) {
      id
      status
      groupId
    }
  }
`;

export const SETTLE_SPECIFIC_SHARES = gql`
  mutation SettleSpecificShares(
    $shareIds: [String!]!
    $amount: Float!
    $paymentMode: String!
    $groupId: String
  ) {
    settleSpecificShares(
      shareIds: $shareIds
      amount: $amount
      paymentMode: $paymentMode
      groupId: $groupId
    ) {
      id
      status
      groupId
    }
  }
`;
