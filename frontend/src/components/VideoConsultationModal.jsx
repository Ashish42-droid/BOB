import React, { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { Video, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function VideoConsultationModal({ roomId, onClose, patientName = 'Patient', userName: propUserName, userId: propUserId }) {
  const containerRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    let zpInstance = null;

    const initZegoCall = async () => {
      try {
        const appID = parseInt(import.meta.env.VITE_ZEGOCLOUD_APP_ID || '1586356449');
        const serverSecret = import.meta.env.VITE_ZEGOCLOUD_SERVER_SECRET || '37d7de5083083e70e9d7b6315a428884';
        
        // Clean room ID to contain only alphanumeric and underscores
        const cleanRoomId = (roomId || 'demo_room_101').replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Ensure distinct User ID per participant so ZegoCloud connects two streams cleanly
        const cleanUserId = propUserId || (user?.id ? `${user.role || 'usr'}_${user.id.replace(/[^a-zA-Z0-9]/g, '')}` : `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
        const cleanUserName = propUserName || user?.name || (user?.role === 'DOCTOR' ? 'Dr. Remote Specialist' : `Clinic Assistant (${patientName})`);

        console.log(`📹 Initializing ZegoCloud Video Room: ${cleanRoomId} for User: ${cleanUserName} (${cleanUserId})`);

        // Generate Kit Token
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          cleanRoomId,
          cleanUserId,
          cleanUserName
        );

        zpInstance = ZegoUIKitPrebuilt.create(kitToken);
        zpInstance.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          showPreJoinView: false,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          showScreenSharingButton: true,
          onLeaveRoom: () => {
            if (onClose) onClose();
          }
        });
      } catch (err) {
        console.error('ZegoCloud Video Call init error:', err);
      }
    };

    if (containerRef.current) {
      initZegoCall();
    }

    return () => {
      if (zpInstance) {
        try {
          zpInstance.destroy();
        } catch (e) {}
      }
    };
  }, [roomId, user, propUserName, propUserId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl rounded-lg border border-slate-200 overflow-hidden shadow-xl flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Live Video Teleconsultation
                <span className="text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">Encrypted Call</span>
              </h3>
              <p className="text-xs text-slate-500">Patient: <span className="text-slate-800 font-semibold">{patientName}</span> | Room ID: {roomId}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Zego Container */}
        <div ref={containerRef} className="flex-1 w-full bg-slate-950 min-h-[500px]" />
      </div>
    </div>
  );
}
