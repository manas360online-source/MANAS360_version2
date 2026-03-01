import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { patientApi } from '../../api/patient';

export default function LiveSessionPage() {
  const { id = '' } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);

  const localRef = useRef<HTMLDivElement | null>(null);
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);

  useEffect(() => {
    let mounted = true;

    const join = async () => {
      try {
        const appId = import.meta.env.VITE_AGORA_APP_ID;
        if (!appId) throw new Error('VITE_AGORA_APP_ID is not configured');

        const upcomingRes = await patientApi.getUpcomingSessions();
        const sessions = (upcomingRes.data ?? upcomingRes) as any[];
        const session = sessions.find((s) => String(s.id) === String(id));

        if (!session) throw new Error('Session not found or not upcoming');
        if (!session.agora_channel || !session.agora_token) throw new Error('Agora channel/token unavailable for this session');

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        client.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && user.videoTrack && remoteRef.current) {
            user.videoTrack.play(remoteRef.current);
          }
          if (mediaType === 'audio' && user.audioTrack) {
            user.audioTrack.play();
          }
        });

        client.on('user-unpublished', () => {
          if (remoteRef.current) remoteRef.current.innerHTML = '';
        });

        await client.join(appId, session.agora_channel, session.agora_token, null);

        const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        audioTrackRef.current = microphoneTrack;
        videoTrackRef.current = cameraTrack;

        if (localRef.current) {
          cameraTrack.play(localRef.current);
        }

        await client.publish([microphoneTrack, cameraTrack]);

        if (mounted) setJoining(false);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Unable to join live session');
          setJoining(false);
        }
      }
    };

    void join();

    return () => {
      mounted = false;
      const audio = audioTrackRef.current;
      const video = videoTrackRef.current;
      const client = clientRef.current;

      if (audio) {
        audio.stop();
        audio.close();
      }
      if (video) {
        video.stop();
        video.close();
      }
      if (client) {
        void client.leave();
      }
    };
  }, [id]);

  if (joining) return <div className="responsive-page"><div className="responsive-container">Joining session...</div></div>;
  if (error) return <div className="responsive-page"><div className="responsive-container text-rose-600">{error}</div></div>;

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">Live Session</h1>
      <div className="responsive-grid-2">
        <div className="responsive-card">
          <h2 className="mb-2 text-sm font-medium">Your Video</h2>
          <div ref={localRef} className="h-72 rounded-xl border bg-black" />
        </div>
        <div className="responsive-card">
          <h2 className="mb-2 text-sm font-medium">Therapist Video</h2>
          <div ref={remoteRef} className="h-72 rounded-xl border bg-black" />
        </div>
      </div>
      </div>
    </div>
  );
}
