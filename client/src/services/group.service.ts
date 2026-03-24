import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Alert } from 'react-native';
import {
  CREATE_GROUP,
  GET_GROUPS,
  GET_GROUP_DETAILS,
  GET_GROUP_EXPENSES,
  GET_MY_INVITES,
  INVITE_TO_GROUP,
  JOIN_GROUP,
  REMOVE_GROUP_MEMBER,
  RESPOND_TO_INVITE,
  SEARCH_USERS,
  UPDATE_GROUP,
} from '../graphql';
import { API_URL } from '../apollo/client';

// ─── Queries ───────────────────────────────────────────────

export const useGetGroups = (options?: { fetchPolicy?: any }) => {
  return useQuery<any>(GET_GROUPS, {
    fetchPolicy: options?.fetchPolicy ?? 'cache-and-network',
  });
};

export const useGetGroupDetails = (groupId: string) => {
  return useQuery<any>(GET_GROUP_DETAILS, {
    variables: { id: groupId },
  });
};

export const useGetGroupExpenses = (groupId: string) => {
  return useQuery<any>(GET_GROUP_EXPENSES, {
    variables: { groupId },
  });
};

export const useGetMyInvites = (options?: { fetchPolicy?: any }) => {
  return useQuery<any>(GET_MY_INVITES, {
    fetchPolicy: options?.fetchPolicy ?? 'cache-and-network',
  });
};

// ─── Lazy Queries ──────────────────────────────────────────

export const useSearchUsers = () => {
  return useLazyQuery<any>(SEARCH_USERS);
};

// ─── Mutations ─────────────────────────────────────────────

export const useCreateGroup = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(CREATE_GROUP, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useInviteToGroup = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(INVITE_TO_GROUP, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useRespondToInvite = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(RESPOND_TO_INVITE, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useRemoveGroupMember = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(REMOVE_GROUP_MEMBER, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useJoinGroup = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(JOIN_GROUP, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useUpdateGroup = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(UPDATE_GROUP, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const uploadGroupImage = async (imageUri: string) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('You need to be logged in');
  }

  const fileName = `group_${Date.now()}.jpg`;
  const fileType = 'image/jpeg';
  const uploadUrl = `${API_URL}/api/upload/group-image`;

  const uploadResponse = await ReactNativeBlobUtil.fetch(
    'POST',
    uploadUrl,
    {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
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
