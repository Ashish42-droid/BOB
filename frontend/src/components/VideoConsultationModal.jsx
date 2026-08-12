import React, { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { Video, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function VideoConsultationModal({ roomId, onClose, patientName = 'Patient' }) {
  const containerRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    let zpInstance = null;

    const initZegoCall = async () => {
      try {
        const appID = parseInt(import.meta.env.VITE_ZEGOCLOUD_APP_ID || '1586356449');
        const serverSecret = import.meta.env.VITE_ZEGOCLOUD_SERVER_SECRET || '37d7de5083083e70e9d7b6315a428884';
        const userId = user?.id ? user.id.replace(/-/g, '_') : `user_${Math.floor(Math.random() * 10000)}`;
        const userName = user?.name || 'Doctor';

        // Generate Kit Token
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomId || 'demo_room',
          userId,
          userName
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
        console.error('ZegoCloud init error:', err);
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
  }, [roomId, user]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg">
      <div className="glass-panel w-full max-w-5xl rounded-3xl border border-cyan-500/30 overflow-hidden shadow-2xl flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Video className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Live Video Teleconsultation
                <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">Encrypted Call</span>
              </h3>
              <p className="text-xs text-slate-400">Patient: <span className="text-slate-200 font-semibold">{patientName}</span> | Room ID: {roomId}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zego Container */}
        <div ref={containerRef} className="flex-1 w-full bg-slate-950 min-h-[500px]" />
      </div>
    </div>
  );
}
