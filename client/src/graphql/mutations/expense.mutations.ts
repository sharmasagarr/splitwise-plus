import { gql } from '@apollo/client';

export const CREATE_EXPENSE = gql`
  mutation CreateExpense(
    $groupId: String!
    $description: String!
    $amount: Float!
    $participants: [String!]!
  ) {
    createExpense(
      groupId: $groupId
      description: $description
      amount: $amount
      participants: $participants
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
  ) {
    settleExpense(
      toUserId: $toUserId
      amount: $amount
      paymentMode: $paymentMode
    ) {
      id
      status
    }
  }
`;
