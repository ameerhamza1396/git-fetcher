// src/components/LectureControls.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useVideoCall } from '../video-sdk/VideoCallProvider'; // Adjust path

// <<<<<<< IMPORTANT VIDEO SDK.LIVE IMPORTS >>>>>>>
// Import RTCView on its own line, sometimes this helps bundlers resolve it
import { useMeeting, useParticipant } from '@videosdk.live/react-sdk';
import { RTCView } from '@videosdk.live/react-sdk'; // Separated RTCView import
// <<<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>>

function LectureControls() {
    const { meetingId, isMeetingJoined, leaveMeeting } = useVideoCall(); // get leaveMeeting from context

    // These states are now managed by VideoSDK.live's useMeeting hook,
    // but we'll keep local states for UI toggle display
    const [isMicOn, setIsMicOn] = useState(true);
    const [isWebcamOn, setIsWebcamOn] = useState(true);
    const [isScreenShareActive, setIsScreenShareActive] = useState(false); // To track actual screen share status

    // Access meeting and participant state via VideoSDK.live hooks
    const {
        localWebcamTrack, localMicTrack, // Local tracks
        enableWebcam, disableWebcam,
        enableMic, disableMic,
        toggleWebcam, toggleMic, // Simpler toggles
        startScreenShare, stopScreenShare, // Screen share methods
        participants, // Map of remote participants
        // More hooks and methods are available, explore VideoSDK.live docs
        localParticipant, // Added to get local participant ID for exclusion
        screenShareStream // Access the screen share stream
    } = useMeeting();

    // Effect to manage initial webcam/mic state for the lecturer
    useEffect(() => {
        if (isMeetingJoined) {
            // Initial state based on MeetingProvider config (micEnabled, webcamEnabled)
            // You might want to explicitly call enableWebcam/enableMic here if not
            // handled automatically by MeetingProvider config
            if (localWebcamTrack) {
                setIsWebcamOn(true);
            }
            if (localMicTrack) {
                setIsMicOn(true);
            }
        }
    }, [isMeetingJoined, localWebcamTrack, localMicTrack]);


    // Function to render a single participant's view
    const ParticipantView = ({ participantId }) => {
        const { webcamStream, micStream, displayName, isLocal } = useParticipant(participantId);
        const videoRef = useRef(null);

        useEffect(() => {
            if (videoRef.current && webcamStream) {
                videoRef.current.srcObject = new MediaStream([webcamStream.track]);
                videoRef.current.play(); // Ensure video plays automatically
            }
        }, [webcamStream]);

        return (
            <div style={styles.videoWrapper}>
                {webcamStream?.track && (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={isLocal} // Mute local preview
                        style={styles.videoElement}
                    />
                )}
                {!webcamStream?.track && (
                    <div style={styles.placeholderVideo}>
                        <p>{displayName} (No Cam)</p>
                    </div>
                )}
                <p style={styles.videoLabel}>{displayName || (isLocal ? "You" : "Participant")}</p>
                {micStream?.track && (
                    <span style={styles.micStatus}>
                        Mic {micStream.track.enabled ? 'On' : 'Off'}
                    </span>
                )}
            </div>
        );
    };

    // Handler for local mic toggle
    const handleToggleMic = () => {
        toggleMic(); // VideoSDK.live method
        setIsMicOn(prev => !prev);
    };

    // Handler for local webcam toggle
    const handleToggleWebcam = () => {
        toggleWebcam(); // VideoSDK.live method
        setIsWebcamOn(prev => !prev);
    };

    // Handler for screen share toggle
    const handleToggleScreenShare = async () => {
        if (!isScreenShareActive) {
            await startScreenShare(); // VideoSDK.live method
            setIsScreenShareActive(true);
        } else {
            await stopScreenShare(); // VideoSDK.live method
            setIsScreenShareActive(false);
        }
    };


    if (!isMeetingJoined || !meetingId) {
        return null; // Don't render controls if not in a meeting
    }

    // Convert participants Map to an array for easy mapping
    // Filter out the local participant if they have their own dedicated view
    const remoteParticipantIds = [...participants.keys()].filter(
        (id) => id !== localParticipant.id
    );


    return (
        <div className="lecture-controls" style={styles.container}>
            <h3>Lecture for Classroom: {meetingId}</h3>

            <div style={styles.videoGrid}>
                {/* Lecturer's Local Webcam View */}
                {localWebcamTrack && !isScreenShareActive && ( // Show local cam if not screen sharing
                    <div style={styles.videoWrapper}>
                        <RTCView stream={localWebcamTrack} objectFit={"cover"} style={styles.videoElement} />
                        <p style={styles.videoLabel}>Your Webcam</p>
                    </div>
                )}

                {/* Lecturer's Screen Share View */}
                {isScreenShareActive && screenShareStream && ( // Only render if active AND stream exists
                    <div style={styles.videoWrapper}>
                        <RTCView stream={screenShareStream} objectFit={"contain"} style={styles.videoElement} />
                        <p style={styles.videoLabel}>Your Screen Share</p>
                    </div>
                )}
                {/* Fallback if neither webcam nor screen share is active for local user */}
                {!localWebcamTrack && !isScreenShareActive && (
                    <div style={styles.videoWrapper}>
                        <div style={styles.placeholderVideo}>
                            <p>Your Video Off</p>
                        </div>
                    </div>
                )}


                {/* Remote Participants' Views */}
                {remoteParticipantIds.map((id) => (
                    <ParticipantView key={id} participantId={id} />
                ))}
                {remoteParticipantIds.length === 0 && ( // If no remote participants, show placeholder
                    <div style={styles.videoWrapper}>
                        <div style={styles.placeholderVideo}>
                            <p>Waiting for students...</p>
                        </div>
                    </div>
                )}
            </div>

            <div style={styles.controls}>
                <button
                    onClick={handleToggleScreenShare}
                    style={{ ...styles.controlButton, ...(!isScreenShareActive ? styles.buttonOff : {}) }}
                    title={isScreenShareActive ? 'Stop Screen Share' : 'Start Screen Share'}
                >
                    {isScreenShareActive ? 'Stop Share' : 'Start Share'}
                </button>
                <button
                    onClick={handleToggleMic}
                    style={{ ...styles.controlButton, ...(!isMicOn ? styles.buttonOff : {}) }}
                    title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                    {isMicOn ? 'Mute Mic' : 'Unmute Mic'}
                </button>
                <button
                    onClick={handleToggleWebcam}
                    style={{ ...styles.controlButton, ...(!isWebcamOn ? styles.buttonOff : {}) }}
                    title={isWebcamOn ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                    {isWebcamOn ? 'Cam Off' : 'Cam On'}
                </button>
                <button
                    onClick={leaveMeeting} // Use the leaveMeeting from useVideoCall context
                    style={{ ...styles.controlButton, ...styles.endButton }}
                    title="End Lecture"
                >
                    End Lecture
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        marginTop: '20px',
        width: '100%',
        maxWidth: '900px',
        margin: '20px auto',
        boxSizing: 'border-box',
    },
    videoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '15px',
        marginTop: '20px',
        marginBottom: '20px',
    },
    videoWrapper: {
        backgroundColor: '#333',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        paddingTop: '56.25%', // 16:9 aspect ratio
    },
    videoElement: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain', // Use 'contain' for screen share, 'cover' for webcam
        backgroundColor: 'black',
    },
    placeholderVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#ccc',
        fontSize: '18px',
        border: '1px dashed #555',
        backgroundColor: '#444',
    },
    videoLabel: {
        position: 'absolute',
        bottom: '5px',
        left: '5px',
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '2px 5px',
        borderRadius: '3px',
        fontSize: '12px',
    },
    micStatus: { // Added for mic status display
        position: 'absolute',
        top: '5px',
        right: '5px',
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '2px 5px',
        borderRadius: '3px',
        fontSize: '10px',
    },
    controls: {
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginTop: '20px',
        flexWrap: 'wrap', // Allow buttons to wrap on smaller screens
    },
    controlButton: {
        padding: '10px 15px', // Slightly adjusted padding
        borderRadius: '25px',
        border: '1px solid #ddd',
        backgroundColor: '#007bff',
        color: 'white',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        minWidth: '100px', // Ensure buttons have a minimum width
    },
    controlButtonHover: {
        backgroundColor: '#0056b3',
    },
    buttonOff: {
        backgroundColor: '#6c757d',
        borderColor: '#6c757d',
    },
    buttonOffHover: {
        backgroundColor: '#5a6268',
    },
    endButton: {
        backgroundColor: '#f44336',
    },
    endButtonHover: {
        backgroundColor: '#d32f2f',
    }
};

export default LectureControls;