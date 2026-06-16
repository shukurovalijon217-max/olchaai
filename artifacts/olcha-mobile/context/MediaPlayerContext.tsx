import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { Audio } from "expo-av";

export interface MediaTrack {
  id: string;
  title: string;
  artist?: string;
  artworkUrl?: string | null;
  audioUrl?: string;
  duration?: number;
}

interface MediaPlayerState {
  track: MediaTrack | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  speed: number;
  isMini: boolean;
  isExpanded: boolean;
}

interface MediaPlayerActions {
  play: (track: MediaTrack) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
  setSpeed: (rate: number) => Promise<void>;
  setMini: (v: boolean) => void;
  setExpanded: (v: boolean) => void;
  dismiss: () => void;
}

const Ctx = createContext<(MediaPlayerState & MediaPlayerActions) | null>(null);

export function MediaPlayerProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [track, setTrack] = useState<MediaTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [isMini, setIsMini] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const posInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      if (posInterval.current) clearInterval(posInterval.current);
    };
  }, []);

  const startPositionTracking = useCallback(() => {
    if (posInterval.current) clearInterval(posInterval.current);
    posInterval.current = setInterval(async () => {
      const s = soundRef.current;
      if (!s) return;
      const status = await s.getStatusAsync().catch(() => null);
      if (status?.isLoaded) {
        setPosition(status.positionMillis);
        setDuration(status.durationMillis ?? 0);
      }
    }, 500);
  }, []);

  const stopPositionTracking = useCallback(() => {
    if (posInterval.current) { clearInterval(posInterval.current); posInterval.current = null; }
  }, []);

  const play = useCallback(async (newTrack: MediaTrack) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    stopPositionTracking();
    setTrack(newTrack);
    setPosition(0);
    setDuration(newTrack.duration ?? 0);
    setIsPlaying(false);

    if (!newTrack.audioUrl) {
      setIsPlaying(true);
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: newTrack.audioUrl },
        { shouldPlay: true, rate: speed, shouldCorrectPitch: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          setPosition(status.positionMillis);
          setDuration(status.durationMillis ?? 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            stopPositionTracking();
          }
        }
      });
      setIsPlaying(true);
      startPositionTracking();
    } catch {
      setIsPlaying(true);
    }
  }, [speed, startPositionTracking, stopPositionTracking]);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync().catch(() => {});
    setIsPlaying(false);
    stopPositionTracking();
  }, [stopPositionTracking]);

  const resume = useCallback(async () => {
    await soundRef.current?.playAsync().catch(() => {});
    setIsPlaying(true);
    startPositionTracking();
  }, [startPositionTracking]);

  const stop = useCallback(async () => {
    await soundRef.current?.stopAsync().catch(() => {});
    setIsPlaying(false);
    stopPositionTracking();
  }, [stopPositionTracking]);

  const seekTo = useCallback(async (ms: number) => {
    await soundRef.current?.setPositionAsync(ms).catch(() => {});
    setPosition(ms);
  }, []);

  const setSpeed = useCallback(async (rate: number) => {
    setSpeedState(rate);
    await soundRef.current?.setRateAsync(rate, true).catch(() => {});
  }, []);

  const dismiss = useCallback(() => {
    stop();
    setTrack(null);
    setIsMini(true);
    setIsExpanded(false);
  }, [stop]);

  return (
    <Ctx.Provider value={{
      track, isPlaying, position, duration, speed, isMini, isExpanded,
      play, pause, resume, stop, seekTo, setSpeed,
      setMini: setIsMini,
      setExpanded: setIsExpanded,
      dismiss,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMediaPlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMediaPlayer must be inside MediaPlayerProvider");
  return ctx;
}
