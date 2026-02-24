// src/video-sdk/VideoCallProvider.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { MeetingProvider } from '@videosdk.live/react-sdk';

const VideoCallContext = createContext(null);

export const useVideoCall = () => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};

// 🚨 Replace this with your actual secure token in production
const VIDEOSDK_AUTH_TOKEN = "YOUR_HARDCODED_OR_DYNAMIC_TOKEN";

export function VideoCallProvider({ children, onMeetingStarted }) {
  const [meetingId, setMeetingId] = useState(null);
  const [isMeetingJoined, setIsMeetingJoined] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [token, setToken] = useState(VIDEOSDK_AUTH_TOKEN);

  const _joinMeeting = useCallback(async (roomId, userName) => {
    if (!roomId) return;

    try {
      // ✅ Trigger media permission before setting up the meeting
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log("✅ Media permissions granted");

      setMeetingId(roomId);
      console.log(`Preparing to join meeting: ${roomId}`);
    } catch (err) {
      console.error("❌ Error accessing media devices:", err);
      alert("Please allow access to your webcam and microphone to start the lecture.");
    }
  }, []);

  const _leaveMeeting = useCallback(() => {
    setMeetingId(null);
    setIsMeetingJoined(false);
    setIsScreenSharing(false);
    console.log("Left meeting.");
  }, []);

  const onMeetingJoined = useCallback(() => {
    console.log("✅ Video SDK: Meeting successfully joined!");
    setIsMeetingJoined(true);
    if (onMeetingStarted) onMeetingStarted();
  }, [onMeetingStarted]);

  const onMeetingLeft = useCallback(() => {
    console.log("⛔ Video SDK: Meeting left.");
    setIsMeetingJoined(false);
    setMeetingId(null);
    setIsScreenSharing(false);
  }, []);

  const value = {
    meetingId,
    isMeetingJoined,
    isScreenSharing,
    joinMeeting: _joinMeeting,
    leaveMeeting: _leaveMeeting,
    toggleScreenShare: setIsScreenSharing,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {meetingId && token ? (
        <MeetingProvider
          config={{
            meetingId: meetingId,
            micEnabled: true,
            webcamEnabled: true,
            name: "Lecturer User",
          }}
          token={token}
          onMeetingJoined={onMeetingJoined}
          onMeetingLeft={onMeetingLeft}
        >
          {children}
        </MeetingProvider>
      ) : (
        children
      )}
    </VideoCallContext.Provider>
  );
}
