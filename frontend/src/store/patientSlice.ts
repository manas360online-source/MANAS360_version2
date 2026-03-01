import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { patientApi } from '../api/patient';

export const fetchNotifications = createAsyncThunk('patient/fetchNotifications', async () => {
  const res = await patientApi.getNotifications();
  return (res.data ?? res) as any[];
});

type PatientState = {
  notifications: any[];
  loadingNotifications: boolean;
};

const initialState: PatientState = {
  notifications: [],
  loadingNotifications: false,
};

const patientSlice = createSlice({
  name: 'patient',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loadingNotifications = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loadingNotifications = false;
        state.notifications = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loadingNotifications = false;
      });
  },
});

export default patientSlice.reducer;
