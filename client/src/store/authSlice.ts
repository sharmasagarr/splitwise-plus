import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../services/auth.service";
import { User } from "../types/graphql";
import { client } from "../apollo";

/* ================= TYPES ================= */

interface AuthState {
  token: string | null;
  user: User | null;
  ready: boolean;
}

/* ================= THUNKS ================= */

// Restore auth on app start (TOKEN ONLY)
export const restoreAuth = createAsyncThunk<string | null>(
  "auth/restore",
  async () => {
    const token = await AsyncStorage.getItem("token");
    return token;
  }
);

// Set auth when login or signup using oauth
export const setAuthWithPersistence = createAsyncThunk<
  { token: string; user: User | null },
  { token: string; user: User | null }
>(
  "auth/setAuthWithPersistence",
  async ({ token, user }) => {
    await AsyncStorage.setItem("token", token);
    return { token, user };
  }
);

// Fetch logged-in user (/me)
export const fetchMe = createAsyncThunk<User>(
  "auth/fetchMe",
  async () => {
    const user = await authService.getMe();
    return user;
  }
);

// Logout thunk
export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    await AsyncStorage.removeItem("token");

    // 🔥 VERY IMPORTANT
    await client.clearStore();

    dispatch(logout());
  }
);

/* ================= SLICE ================= */

const initialState: AuthState = {
  token: null,
  user: null,
  ready: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Called after login/signup
    setAuth(
      state,
      action: PayloadAction<{ token: string; user: User | null }>
    ) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.ready = true;
    },

    // Manual user update (optional)
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },

    logout(state) {
      state.token = null;
      state.user = null;
      state.ready = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // restoreAuth
      .addCase(restoreAuth.pending, (state) => {
        state.ready = false;
      })
      .addCase(restoreAuth.fulfilled, (state, action) => {
        state.token = action.payload;
        state.ready = true;
      })
      .addCase(restoreAuth.rejected, (state) => {
        state.token = null;
        state.ready = true;
      })

      // fetchMe
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
      })

      // OAuth login persistence
      .addCase(setAuthWithPersistence.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.ready = true;
      });
  },
});

export const { setAuth, setUser, logout } = authSlice.actions;
export default authSlice.reducer;