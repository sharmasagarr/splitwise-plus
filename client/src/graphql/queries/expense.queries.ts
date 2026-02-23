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
