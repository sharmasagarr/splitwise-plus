import { gql } from '@apollo/client';

export const GET_GROUP_EXPENSES = gql`
  query GetGroupExpenses($groupId: String!) {
    getGroupExpenses(groupId: $groupId) {
      id
      totalAmount
      currency
      note
      createdAt
      createdBy {
        id
        name
      }
      shares {
        id
        userId
        shareAmount
        paidAmount
        status
        user {
          id
          name
        }
      }
    }
  }
`;

export const GET_RECENT_ACTIVITIES = gql`
  query GetRecentActivities {
    getRecentActivities {
      id
      totalAmount
      currency
      note
      createdAt
      createdBy {
        id
        name
      }
      groupId
      shares {
        id
        userId
        shareAmount
        paidAmount
        status
        user {
          id
          name
        }
      }
    }
  }
`;

export const GET_MY_BALANCES = gql`
  query GetMyBalances {
    getMyBalances {
      totalOwe
      totalOwed
      oweList {
        userId
        userName
        amount
      }
      owedList {
        userId
        userName
        amount
      }
    }
  }
`;

export const GET_EXPENSE_DETAIL = gql`
  query GetExpenseDetail($expenseId: String!) {
    getExpenseDetail(expenseId: $expenseId) {
      id
      groupId
      totalAmount
      currency
      note
      createdAt
      createdBy {
        id
        name
        email
      }
      shares {
        id
        userId
        shareAmount
        paidAmount
        status
        user {
          id
          name
          username
          imageUrl
        }
      }
      attachments {
        id
        url
        filename
        contentType
        createdAt
      }
    }
  }
`;

export const GET_USER_UNSETTLED_SHARES = gql`
  query GetUserUnsettledShares($toUserId: String!, $groupId: String) {
    getUserUnsettledShares(toUserId: $toUserId, groupId: $groupId) {
      id
      expenseId
      userId
      shareAmount
      paidAmount
      status
      expense {
        id
        note
        createdAt
        groupId
        createdBy {
          id
          name
          imageUrl
          username
          upiId
        }
        group {
          id
          name
        }
      }
    }
  }
`;

export const GET_MY_TRANSACTIONS = gql`
  query GetMyTransactions(
    $relatedUserId: String
    $type: String
    $limit: Int
    $offset: Int
  ) {
    getMyTransactions(
      relatedUserId: $relatedUserId
      type: $type
      limit: $limit
      offset: $offset
    ) {
      id
      userId
      counterpartyUserId
      expenseId
      settlementId
      groupId
      type
      direction
      amount
      currency
      note
      paymentMethodId
      createdAt
    }
  }
`;
