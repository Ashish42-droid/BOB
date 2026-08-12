import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Wifi, AlertTriangle, ShieldCheck, RefreshCw, UserCheck } from 'lucide-react';

/**
 * Custom Pure WebRTC Video Call Component
 * Connects directly to backend raw WebSocket signaling server (ws://localhost:5000/signal)
 * Uses native browser RTCPeerConnection with Google STUN servers.
 */

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export default function WebRTCVideoCallModal({ roomId, userName, userId, role = 'CLINIC_ASSISTANT', peerName = 'Remote Participant', onClose }) {
  const [signalState, setSignalState] = useState('CONNECTING'); // CONNECTING | CONNECTED | RECONNECTING | DISCONNECTED
  const [peerConnState, setPeerConnState] = useState('NEW'); // NEW | CONNECTING | CONNECTED | DISCONNECTED | FAILED
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [peerJoined, setPeerJoined] = useState(false);
  const [callEndedReason, setCallEndedReason] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceCandidateBufferRef = useRef([]);

  useEffect(() => {
    let isMounted = true;

    async function initWebRTC() {
      try {
        // 1. Get Local Media Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStreamRef.current = stream;

        if (localVideoRef.current && isMounted) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Connect to Raw WebSocket Signaling Server
        const wsUrl = `ws://${window.location.hostname}:5000/signal?roomId=${encodeURIComponent(roomId)}&role=${encodeURIComponent(role)}&userId=${encodeURIComponent(userId)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          console.log(`🔌 Connected to Signaling Server on ${wsUrl}`);
          setSignalState('CONNECTED');

          // Send join-room payload
          ws.send(JSON.stringify({
            type: 'join-room',
            roomId,
            role,
            userId
          }));
        };

        ws.onmessage = async (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            handleIncomingSignalingMessage(data);
          } catch (err) {
            console.error('Signal parse error:', err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          console.warn('🔌 Signaling WebSocket Disconnected');
          setSignalState('RECONNECTING');
          
          // Reconnect grace period attempt after 3s
          setTimeout(() => {
            if (isMounted && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
              console.log('🔄 Attempting WebSocket Reconnection...');
              initWebRTC();
            }
          }, 3000);
        };

        ws.onerror = (err) => {
          if (!isMounted) return;
          console.error('WebSocket Error:', err);
          setSignalState('DISCONNECTED');
        };

        // 3. Initialize RTCPeerConnection
        createPeerConnection();

      } catch (mediaErr) {
        console.error('Media stream error:', mediaErr);
        if (isMounted) setCallEndedReason('Camera/Microphone permission denied or device missing');
      }
    }

    initWebRTC();

    return () => {
      isMounted = false;
      cleanupCall();
    };
  }, [roomId]);

  function createPeerConnection() {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcRef.current = pc;

    // Attach local stream tracks to Peer Connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Remote Track Listener
    pc.ontrack = (event) => {
      console.log('🎥 Remote track received:', event.streams);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE Candidate Listener
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          roomId,
          candidate: event.candidate
        }));
      }
    };

    // Connection State Listener
    pc.onconnectionstatechange = () => {
      console.log(`📡 WebRTC PeerConnection State: ${pc.connectionState}`);
      setPeerConnState(pc.connectionState.toUpperCase());

      if (pc.connectionState === 'connected') {
        setCallEndedReason(null);
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setCallEndedReason('Media connection lost or peer disconnected.');
      }
    };

    return pc;
  }

  async function handleIncomingSignalingMessage(data) {
    const pc = pcRef.current || createPeerConnection();

    switch (data.type) {
      case 'peer-joined': {
        console.log(`👤 Peer Joined: ${data.userId} (${data.role})`);
        setPeerJoined(true);

        // If Doctor / Initiator role, create and send SDP Offer
        if (role === 'DOCTOR' || role === 'CLINIC_ASSISTANT') {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'offer',
                roomId,
                sdp: offer
              }));
            }
          } catch (err) {
            console.error('Failed to create offer:', err);
          }
        }
        break;
      }

      case 'offer': {
        console.log('📩 SDP Offer received');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          // Flush any buffered ICE candidates
          while (iceCandidateBufferRef.current.length > 0) {
            const cand = iceCandidateBufferRef.current.shift();
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'answer',
              roomId,
              sdp: answer
            }));
          }
        } catch (err) {
          console.error('Failed to handle offer:', err);
        }
        break;
      }

      case 'answer': {
        console.log('📩 SDP Answer received');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (err) {
          console.error('Failed to set remote description from answer:', err);
        }
        break;
      }

      case 'ice-candidate': {
        if (data.candidate) {
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
              iceCandidateBufferRef.current.push(data.candidate);
            }
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
        break;
      }

      case 'peer-left': {
        console.warn(`👋 Peer left call: ${data.userId}`);
        setPeerJoined(false);
        setCallEndedReason(data.reason === 'DISCONNECTED' ? 'Peer connection lost unexpectedly.' : 'Peer left the video call.');
        break;
      }

      default:
        break;
    }
  }

  function toggleAudio() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  }

  function toggleVideo() {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  }

  function cleanupCall() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave-room', roomId }));
      wsRef.current.close();
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
  }

  function handleEndCall() {
    cleanupCall();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Teleconsultation Room <span className="font-mono text-xs text-blue-400">({roomId})</span>
              </h3>
              <p className="text-[11px] text-slate-400">User: <strong className="text-slate-200">{userName}</strong> ({role})</p>
            </div>
          </div>

          {/* Connection Status Indicators */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
              <Wifi className={`w-3.5 h-3.5 ${signalState === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
              <span className="text-[11px] text-slate-300">Signal: <strong className="text-slate-100">{signalState}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
              <ShieldCheck className={`w-3.5 h-3.5 ${peerConnState === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="text-[11px] text-slate-300">Media: <strong className="text-slate-100">{peerConnState}</strong></span>
            </div>
          </div>
        </div>

        {/* Video Display Grid */}
        <div className="relative flex-1 bg-slate-950 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[360px]">
          
          {/* Local Participant Video */}
          <div className="relative rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted // Always mute local video to prevent audio echo
              className={`w-full h-full object-cover ${isVideoMuted ? 'hidden' : 'block'}`}
            />
            {isVideoMuted && (
              <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                <VideoOff className="w-8 h-8 text-slate-500" />
                <span>Camera Turned Off</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-[11px] font-semibold text-slate-200 border border-slate-700">
              You ({userName}) {isAudioMuted && '🎤 Muted'}
            </div>
          </div>

          {/* Remote Participant Video */}
          <div className="relative rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {peerConnState !== 'CONNECTED' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
                {callEndedReason ? (
                  <>
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                    <div className="text-sm font-bold text-slate-100">{callEndedReason}</div>
                    <p className="text-xs text-slate-400">The video stream has ended.</p>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                    <div className="text-sm font-bold text-slate-100">Waiting for {peerName} to join...</div>
                    <p className="text-xs text-slate-400">Share Room ID <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">{roomId}</code> with doctor or patient.</p>
                  </>
                )}
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-[11px] font-semibold text-slate-200 border border-slate-700">
              {peerName}
            </div>
          </div>

        </div>

        {/* Control Toolbar */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-center gap-4">
          <button
            onClick={toggleAudio}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isAudioMuted ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoMuted ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
            title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            onClick={handleEndCall}
            className="px-6 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-colors"
          >
            <PhoneOff className="w-5 h-5" /> END CONSULTATION
          </button>
        </div>

      </div>
    </div>
  );
}
