import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { markPresence } from "../services/api";

const VideoPlayer = () => {
  const { tmdbId, season, episode } = useParams();
  const navigate = useNavigate();
  const [embedUrl, setEmbedUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sendPresence = () => {
      if (document.visibilityState === "visible") markPresence().catch(() => {});
    };
    sendPresence();
    const interval = window.setInterval(sendPresence, 60_000);
    document.addEventListener("visibilitychange", sendPresence);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", sendPresence);
    };
  }, []);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        let url;
        if (season && episode) {
          url = `${apiUrl}/video/embed/tv/${tmdbId}/${season}/${episode}?sub=en`;
        } else {
          url = `${apiUrl}/video/embed/movie/${tmdbId}?sub=en`;
        }

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            navigate("/");
            return;
          }
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.embedUrl) {
          setEmbedUrl(data.embedUrl);
        } else {
          setError("No video URL returned");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (tmdbId) {
      fetchVideo();
    } else {
      setError("No movie ID provided");
      setLoading(false);
    }
  }, [tmdbId, season, episode, navigate]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalMargin = document.body.style.margin;
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.margin = originalMargin;
      document.documentElement.style.overflow = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.height = '';
      document.body.style.height = '';
    };
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: '#0a0a0a', 
        color: 'white',
        fontSize: '24px',
        margin: 0,
        padding: 0
      }}>
        Loading video...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: '#0a0a0a', 
        color: 'white',
        margin: 0,
        padding: 0
      }}>
        <div style={{ fontSize: '24px', marginBottom: '20px', color: 'red' }}>
          Error: {error}
        </div>
        <button 
          onClick={() => navigate("/")}
          style={{ 
            padding: '10px 20px', 
            background: '#e50914', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw', 
      height: '100vh', 
      background: '#000', 
      overflow: 'hidden',
      margin: 0,
      padding: 0
    }}>
      <button 
        onClick={() => navigate("/")}
        style={{ 
          position: 'absolute', 
          top: '20px', 
          left: '20px', 
          zIndex: 1000, 
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          border: 'none',
          padding: '10px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '24px',
          fontWeight: 'bold',
          lineHeight: 1,
          fontFamily: 'monospace'
        }}
        aria-label="Go back"
      >
        &lt;
      </button>
      {embedUrl && (
        <iframe
          src={embedUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
          allowFullScreen
          frameBorder="0"
          title="Video Player"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        />
      )}
    </div>
  );
};

export default VideoPlayer;
