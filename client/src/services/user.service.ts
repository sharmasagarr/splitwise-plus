import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { UPDATE_PROFILE } from '../graphql/mutations';
import { GET_GROUPS, GET_MY_BALANCES, CHECK_USERNAME_AVAILABILITY } from '../graphql/queries';
import { API_URL } from '../apollo/client';
import type { UsernameAvailabilityResult } from '../types/graphql';

// ─── Queries ───────────────────────────────────────────────

export const useGetGroupsForProfile = (options?: { fetchPolicy?: any }) => {
  return useQuery<any>(GET_GROUPS, {
    fetchPolicy: options?.fetchPolicy ?? 'cache-and-network',
  });
};

export const useGetBalancesForProfile = (options?: { fetchPolicy?: any }) => {
  return useQuery<any>(GET_MY_BALANCES, {
    fetchPolicy: options?.fetchPolicy ?? 'cache-and-network',
  });
};

export const useCheckUsernameAvailability = () => {
  return useLazyQuery<UsernameAvailabilityResult>(CHECK_USERNAME_AVAILABILITY, {
    fetchPolicy: 'network-only',
  });
};

// ─── Mutations ─────────────────────────────────────────────

export const useUpdateProfile = () => {
  return useMutation<any>(UPDATE_PROFILE);
};

// ─── REST Upload Services ──────────────────────────────────

export const uploadProfilePicture = async (imageUri: string) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('You need to be logged in');
  }

  const fileName = `profile_${Date.now()}.jpg`;
  const fileType = 'image/jpeg';
  const uploadUrl = `${API_URL}/api/upload/profile-picture`;

  const uploadResponse = await ReactNativeBlobUtil.fetch(
    'POST',
    uploadUrl,
    {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'multipart/form-data',
    },
    [
      {
        name: 'file',
        filename: fileName,
        type: fileType,
        data: ReactNativeBlobUtil.wrap(imageUri.replace('file://', '')),
      },
    ],
  );

  const statusCode = uploadResponse.info().status;
  const rawText = await Promise.resolve(uploadResponse.text());
  const responseText =
    typeof rawText === 'string' ? rawText : JSON.stringify(rawText ?? '');

  let json: any;
  try {
    json = await Promise.resolve(uploadResponse.json());
  } catch {
    throw new Error(
      `Invalid server response: ${responseText.substring(0, 100)}`,
    );
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(json.error || `Upload failed: HTTP ${statusCode}`);
  }

  return json;
};

export const uploadExpenseAttachment = async (
  imageUri: string,
  expenseId: string,
) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('You need to be logged in');
  }

  const fileName = `expense_${Date.now()}.jpg`;
  const fileType = 'image/jpeg';
  const uploadUrl = `${API_URL}/api/upload/expense-attachment`;

  const uploadResponse = await ReactNativeBlobUtil.fetch(
    'POST',
    uploadUrl,
    {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'multipart/form-data',
    },
    [
      {
        name: 'file',
        filename: fileName,
        type: fileType,
        data: ReactNativeBlobUtil.wrap(imageUri.replace('file://', '')),
      },
      {
        name: 'expenseId',
        data: expenseId,
      },
    ],
  );

  const statusCode = uploadResponse.info().status;
  const rawText = await Promise.resolve(uploadResponse.text());
  const responseText =
    typeof rawText === 'string' ? rawText : JSON.stringify(rawText ?? '');

  let json: any;
  try {
    json = await Promise.resolve(uploadResponse.json());
  } catch {
    throw new Error(
      `Invalid server response: ${responseText.substring(0, 100)}`,
    );
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(json.error || `Upload failed: HTTP ${statusCode}`);
  }

  return json;
};
