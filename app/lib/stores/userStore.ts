import { create } from "zustand"
import { SpotifyProfile, User } from "../models/User"

interface UserStore {
  user: User | null
  spotifyProfile: SpotifyProfile | null
  setUser: (user: UserStore["user"]) => void
  setSpotifyProfile: (profile: UserStore["spotifyProfile"]) => void
  initialize: (user: UserStore["user"], profile: UserStore["spotifyProfile"]) => void
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  spotifyProfile: null,
  setUser: (user) => set({ user }),
  setSpotifyProfile: (spotifyProfile) => set({ spotifyProfile }),
  initialize: (user, spotifyProfile) => {
    const state = get()
    if (state.user !== user || state.spotifyProfile !== spotifyProfile) {
      set({ user, spotifyProfile })
    }
  },
}))