import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

const VideoPlayer = () => {
  const { tmdbId, season, episode } = useParams();
  const navigate = useNavigate();
  const [embedUrl, setEmbedUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };

    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        
        // Vite injects the deployed API URL at build time. Keep the local
        // fallback for development, but never hardcode localhost in production.
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        let url;
        if (season && episode) {
          url = `${apiUrl}/video/embed/tv/${tmdbId}/${season}/${episode}?sub=en`;
        } else {
          url = `${apiUrl}/video/embed/movie/${tmdbId}?sub=en`;
        }

        console.log("Fetching:", url);

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

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await playerRef.current?.requestFullscreen();
      }
    } catch (fullscreenError) {
      console.error("Unable to enter fullscreen:", fullscreenError);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: '#0a0a0a', 
        color: 'white',
        fontSize: '24px'
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
        color: 'white'
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
    <div ref={playerRef} className="video-player-page">
      <button 
        onClick={() => navigate("/")}
        className="video-player-back"
      >
        ← Back to Home
      </button>
      <button
        onClick={toggleFullscreen}
        className="video-player-fullscreen"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      </button>
      {embedUrl && (
        <iframe
          src={embedUrl}
          className="video-player-frame"
          allowFullScreen
          frameBorder="0"
          title="Video Player"
          allow="autoplay; fullscreen; picture-in-picture"
        />
      )}
    </div>
  );
};

export default VideoPlayer;
