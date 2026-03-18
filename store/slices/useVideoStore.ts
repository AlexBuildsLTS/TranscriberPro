// store/slices/useVideoStore.ts
import { create } from 'zustand';
import { Database } from '../../types/database/database.types';

type VideoStatus = Database['public']['Enums']['video_status'];

// THIS is what your app is currently missing. It defines both 'videos' and 'updateVideoStatus'.
export interface VideoState {
  videos: Record<string, { status: VideoStatus }>;
  updateVideoStatus: (id: string, status: VideoStatus) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videos: {},
  updateVideoStatus: (id, status) =>
    set((state) => ({
      videos: {
        ...state.videos,
        [id]: {
          ...state.videos[id],
          status,
        },
      },
    })),
}));
