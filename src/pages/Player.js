/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useCallback, useContext, useEffect, useRef, useState, memo } from 'react';
import ReactPlayer from 'react-player';
import { useParams, useNavigate, } from "react-router-dom";
import { Box, Alert, Grid, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, FormGroup, Snackbar, } from '@mui/material';
import { findDOMNode } from 'react-dom';

import LayoutContext from '../contexts/LayoutContext';
import VideosContext from '../contexts/VideosContext';
import PlayerContext from '../contexts/PlayerContext';

import PlayerContextMenu from '../components/PlayerContextMenu';
import VideoList from '../components/VideoList';
import Loading from '../components/Loading';
import LogDialog from '../components/LogDialog';

// SVG icon helpers
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M8 5v14l11-7z" /></svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
);
const VolumeHighIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
);
const VolumeMuteIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
);
const FullscreenIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
);
const FullscreenExitIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" /></svg>
);
// Stretch Mode off: plain widescreen frame
const StretchModeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
  </svg>
);
// Stretch Mode on: frame with the top ~75% region highlighted
const StretchModeActiveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <rect x="3" y="5" width="18" height="10.5" fill="white" opacity="0.35" stroke="none" />
    <line x1="3" y1="15.5" x2="21" y2="15.5" strokeDasharray="2,2" />
  </svg>
);

// ---- Storyboard (.sbb) support -------------------------------------------------------------
// A .sbb file (created by nightplayer-manager) holds BIG JPEG sheets, each a rows x columns grid of
// small preview images taken `fps` times per second. Layout (little-endian): 8 byte magic, u32 version,
// u32 sheet count, u32 width, u32 height, f64 fps, u32 rows, u32 columns, 24 reserved bytes, then
// 20 bytes per sheet (u32 index, u32 offset, u32 size, f64 seconds covered), then the JPEG data.
const SBB_MAGIC = [0x53, 0x54, 0x4f, 0x52, 0x59, 0x73, 0x62, 0x1a];
const SBB_SCALE = 2; // 160x90 frames are shown at 320x180

function parseSbb(arrayBuffer) {
  if (arrayBuffer.byteLength < 64) return null;
  const data = new DataView(arrayBuffer);
  for (let i = 0; i < SBB_MAGIC.length; i++) {
    if (data.getUint8(i) !== SBB_MAGIC[i]) return null;
  }
  const count = data.getUint32(12, true);
  const width = data.getUint32(16, true);
  const height = data.getUint32(20, true);
  const fps = data.getFloat64(24, true);
  const rows = data.getUint32(32, true);
  const columns = data.getUint32(36, true);
  if (!count || !width || !height || !(fps > 0) || !rows || !columns || 64 + count * 20 > arrayBuffer.byteLength) {
    return null;
  }
  const sheets = [];
  for (let i = 0; i < count; i++) {
    const at = 64 + i * 20;
    sheets.push({
      offset: data.getUint32(at + 4, true),
      size: data.getUint32(at + 8, true),
      duration: data.getFloat64(at + 12, true),
    });
  }
  return { arrayBuffer, width, height, fps, rows, columns, sheets };
}

/** Which sheet, and which column/row inside it, shows the preview for `time` seconds. */
function findStoryboardFrame(sb, time) {
  let start = 0;
  for (let i = 0; i < sb.sheets.length; i++) {
    const sheet = sb.sheets[i];
    if (time < start + sheet.duration || i === sb.sheets.length - 1) {
      const frames = Math.min(sb.rows * sb.columns, Math.max(1, Math.round(sheet.duration * sb.fps)));
      const p = Math.min(frames - 1, Math.max(0, Math.floor((time - start) * sb.fps)));
      return { sheet: i, x: p % sb.columns, y: Math.floor(p / sb.columns) };
    }
    start += sheet.duration;
  }
  return null;
}

const ProgressBar = memo(function ProgressBar({
  played, buffered, duration, progressBarRef, onProgressClick, formatTime,
  previewRef, thumbRef, previewTimeRef, onHoverStart, onHover, onHoverEnd,
}) {
  return (
    <>
      {/* Progress bar */}
      <div
        ref={progressBarRef}
        onClick={onProgressClick}
        style={{
          position: 'relative',
          height: '4px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.25)',
          cursor: 'pointer',
          marginBottom: '8px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.height = '8px'; e.currentTarget.style.top = '2px'; onHoverStart(); }}
        onMouseMove={onHover}
        onMouseLeave={(e) => { e.currentTarget.style.height = '4px'; e.currentTarget.style.top = '0px'; onHoverEnd(); }}
      >
        {/* Storyboard preview (hidden until the mouse is over the bar and the storyboard has loaded) */}
        <div
          ref={previewRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 14px)',
            left: 0,
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <div
            ref={thumbRef}
            style={{
              boxSizing: 'content-box',
              width: `${160 * SBB_SCALE}px`,
              height: `${90 * SBB_SCALE}px`,
              border: '2px solid #fff',
              borderRadius: '4px',
              background: '#000 no-repeat',
            }}
          />
          <span
            ref={previewTimeRef}
            style={{
              marginTop: '4px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.75)',
              color: '#fff', fontSize: '13px', fontFamily: 'Roboto, sans-serif',
            }}
          >0:00</span>
        </div>
        {/* Buffered */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${buffered * 100}%`,
          background: 'rgba(255,255,255,0.4)',
          borderRadius: '2px',
          pointerEvents: 'none',
        }} />
        {/* Played */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${played * 100}%`,
          background: '#ff0000',
          borderRadius: '2px',
          pointerEvents: 'none',
        }} />
        {/* Scrubber dot */}
        <div style={{
          position: 'absolute', top: '50%',
          left: `${played * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: '12px', height: '12px',
          background: '#ff0000',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
      </div>
    </>
  );
});

const TimeDisplay = memo(function TimeDisplay({ played, duration, formatTime }) {
  return (
    <span style={{ color: '#fff', fontSize: '13px', fontFamily: 'Roboto, sans-serif', marginLeft: '4px' }}>
      {formatTime(played * duration)} / {formatTime(duration)}
    </span>
  );
});

export default function Player(props) {
  const { setTitle } = useContext(LayoutContext);
  const {
    videos,
    saveVideo,
    loading,
    updateLastAction,
    autoplayRef,
    settings,
  } = useContext(VideosContext);
  const navigate = useNavigate();
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const [snack, setSnack] = useState({ open: false, message: "" });
  const playing = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastSaveRef = useRef(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [jumpDialog, setJumpDialog] = useState({ open: false });
  const [showLogDialog, setShowLogDialog] = useState(false);
  const seekPosition = useRef(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [storyBoardUrl, setStoryBoardUrl] = useState("");
  
  const hasSeekedRef = useRef(false);
  const clickTimerRef = useRef(null);
  const [mouseVisible, setMouseVisible] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimeoutRef = useRef(null);
  const INACTIVITY_TIMEOUT = 3000; // 3 seconds
  const hostedLocal = useRef(false);

  // Custom controls state (used when hostedLocal.current === true)
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);       // 0–1 fraction
  const [buffered, setBuffered] = useState(0);   // 0–1 fraction
  const [duration, setDuration] = useState(0);
  const progressBarRef = useRef(null);
  const fullscreen = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stretchMode, setStretchMode] = useState(false);
  const snackTimeoutRef = useRef(null);

  // Storyboard preview (only for locally hosted videos); all DOM updates go through refs so that
  // moving the mouse does not re-render the player.
  const storyboardRef = useRef(null);   // { ...parsed .sbb, urls: [] } or null
  const previewRef = useRef(null);
  const thumbRef = useRef(null);
  const previewTimeRef = useRef(null);
  const hoverActiveRef = useRef(false);
  const lastSheetRef = useRef(-1);

  // get active video
  let { uuid } = useParams(); // get id from url (e.g. /player/:uuid)

  const [video, setVideo] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // change title
    if (video) {
      setTitle(video.title ?? "Video Title Not Found");
    }
  }, [setTitle, video]);

  const updatePlaying = useCallback((state) => {
    playing.current = state;
    setIsPlaying(state);
  }, [setIsPlaying]);

  const showSnack = useCallback((message) => {
    setSnack({ open: true, message });

    if (snackTimeoutRef.current) {
      clearTimeout(snackTimeoutRef.current);
    }
    snackTimeoutRef.current = setTimeout(() => {
      setSnack({ open: false, message });
      snackTimeoutRef.current = null;
    }, 500);
  }, [snackTimeoutRef]);

  useEffect(() => {
    // set current video
    let video = null;
    for (const item of videos) {
      //console.log(item.uuid, uuid, item.uuid === uuid);
      if (item.uuid === uuid) {
        video = item;
        break;
      }
    }
    setVideo(video);
    if (!video) {
      setNotFound(true);
    } else {
      setNotFound(false);
    }
    hasSeekedRef.current = false;

    updatePlaying(autoplayRef.current);
    autoplayRef.current = false; // don't autoplay next time video is loaded
  }, [uuid, videos, setVideo, autoplayRef, setNotFound, updatePlaying]);

  useEffect(() => {
    hostedLocal.current = (settings?.manager.host && video?.ytdlpComplete === 1);
  }, [video, settings]);

  const hideMouse = useCallback((playingOverride = null) => {
    // Clear existing timer
    if (hideTimeoutRef.current) {
      // console.log("clearTimeout hideTimeoutRef");
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Only start the "hide" timer if we are in fullscreen AND playing
    const isPlaying = playingOverride !== null ? playingOverride : playing.current;
    // console.log("hideMouse", fullscreen.current, playing.current, isPlaying);
    if (fullscreen.current && isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        // console.log("setMouseVisible false");
        setMouseVisible(false);
        setControlsVisible(false);
      }, INACTIVITY_TIMEOUT);
    }
  }, [playing, fullscreen]);

  useEffect(() => {
    const handleMouseMove = () => {
      // Show cursor when movement is detected
      setMouseVisible(true);
      setControlsVisible(true);
      hideMouse();
    };

    window.addEventListener('keydown', handleMouseMove);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseMove);
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [hideMouse]);

  useEffect(() => {
    const fetchUrl = async () => {
      // 1. Handle the "empty" or "loading" state
      if (!video) {
        setVideoUrl("");
        setStoryBoardUrl("");
        return;
      }

      // 2. Perform your logic
      if (hostedLocal.current) {
        const { stream, storyboard } = await video.getYtpUrl(settings);
        setVideoUrl(stream);
        setStoryBoardUrl(storyboard);
      } else {
        setVideoUrl(video.url ?? "");
        setStoryBoardUrl("");
      }
    };

    fetchUrl();
  }, [video, settings, hostedLocal]); // Re-run whenever video or settings change

  // Load the storyboard (.sbb) for locally hosted videos. A missing storyboard (404, not generated
  // yet, ffmpeg failed) is not an error: there is simply no preview.
  useEffect(() => {
    storyboardRef.current = null;
    lastSheetRef.current = -1;
    if (!hostedLocal.current || !videoUrl) {
      return undefined;
    }
    const url = storyBoardUrl;
    if (!url) {
      return undefined;
    }

    let cancelled = false;
    let loaded = null;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          return;
        }
        const sb = parseSbb(await res.arrayBuffer());
        if (!cancelled && sb) {
          loaded = { ...sb, urls: [] };
          storyboardRef.current = loaded;
        }
      } catch (err) {
        console.log("Could not load storyboard", err);
      }
    })();

    return () => {
      cancelled = true;
      if (storyboardRef.current === loaded) {
        storyboardRef.current = null;
      }
      loaded?.urls.forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [videoUrl, hostedLocal, storyBoardUrl]);

  const saveProgress = useCallback(
    (source) => {
      if (!video) {
        return;
      }
      if (loading) {
        return;
      }
      console.log("Saving video", source);
      lastSaveRef.current = Date.now();
      saveVideo(video);
    },
    [loading, video, saveVideo],
  );

  const skip = useCallback(
    (d) => {
      let index = -1;
      const l = videos.length;
      for (let i = 0; i < l; i++) {
        if (video.uuid === videos[i].uuid) {
          index = i;
          break;
        }
      }
      if (index >= -1 && index + d < l && index + d >= 0) {
        navigate("/player/" + videos[index + d].uuid);
      }
    },
    [videos, video, navigate],
  );

  const toggleFullscreen = useCallback(() => {
    console.log('toggleFullscreen');
    if (!document.fullscreenElement) {
      // enter fullscreen
      if (hostedLocal.current) {
        // locally hosted
        playerContainerRef.current.requestFullscreen();
      } else {
        // youtube or twitch
        const iframe = findDOMNode(
          playerRef.current?.player,
        ).getElementsByTagName("iframe")[0];
        iframe.focus();
        iframe.requestFullscreen();
      }
      fullscreen.current = true;
      setIsFullscreen(true);
      // 
    } else {
      // exit fullscreen
      document.exitFullscreen();
      fullscreen.current = false;
      setIsFullscreen(false);
    }
    hideMouse();
  }, [playerRef, hostedLocal, fullscreen, hideMouse, setIsFullscreen]);

  const toggleStretchMode = useCallback(() => {
    setStretchMode((prev) => {
      const next = !prev;
      showSnack(next ? "Stretch Mode on" : "Stretch Mode off");
      return next;
    });
  }, [setStretchMode, showSnack]);

  const onKeyDown = useCallback(
    (e) => {
      const hijackedKeys = [" ", "K", "F", "S", "ARROWLEFT", "ARROWRIGHT", "ARROWDOWN", "ARROWUP", "N", "P"];
      if (hijackedKeys.includes(e.key.toUpperCase())) {
        e.stopImmediatePropagation(); // Stops other listeners on the same element
        setMouseVisible(true);
        setControlsVisible(true);
        hideMouse();
      }

      // console.log('onKeyDown', e);

      const key = e.key.toUpperCase();
      switch (key) {
        case "ARROWLEFT":
          e.preventDefault();
          seekPosition.current -= 5;
          showSnack(`Seeking ${seekPosition.current} seconds.`);
          return true;
        case "ARROWRIGHT":
          e.preventDefault();
          seekPosition.current += 5;
          showSnack(`Seeking +${seekPosition.current} seconds.`);
          return true;
        case "ARROWDOWN":
          if (fullscreen.current) {
            e.preventDefault();
            const v = Math.max(0, volume - 0.05);
            setVolume(v);
            showSnack(`Volume ${Math.round(v * 100)}%`);
            return true;
          }
          break;
        case "ARROWUP":
          if (fullscreen.current) {
            e.preventDefault();
            const v = Math.min(1, volume + 0.05);
            setVolume(v);
            showSnack(`Volume ${Math.round(v * 100)}%`);
            return true;
          }
          break;
        case "F":
          // fullscreen
          e.preventDefault();

          toggleFullscreen();
          return true;
        case "S":
          // stretch mode
          e.preventDefault();

          toggleStretchMode();
          return true;
        case " ":
        case "K":
          if (e.ctrlKey) {
            // do not handle
            return true;
          }
          e.preventDefault();
          // play / pause
          let message = playing.current ? "Pausing." : "Playing.";
          showSnack(message);
          const state = !playing.current;
          updatePlaying(state);
          hideMouse(state);

          return true;
        default:
      }

      if (e.shiftKey) {
        switch (key) {
          case "N":
            // go to next video
            return skip(1);
          case "P":
            // go to previous video
            return skip(-1);
          default:
        }
      }
    },
    [playing, seekPosition, skip, toggleFullscreen, toggleStretchMode, hideMouse, updatePlaying, setMouseVisible, setControlsVisible, volume, showSnack],
  );

  const onKeyUp = useCallback(() => {
    if (seekPosition.current !== 0) {
      const currentTime = playerRef.current?.getCurrentTime("seconds");
      console.log(
        "seeking",
        seekPosition.current,
        currentTime + seekPosition.current,
      );

      playerRef.current?.seekTo(Math.min(currentTime + seekPosition.current, playerRef.current?.getDuration() - 1), "seconds");
    }
    seekPosition.current = 0;
  }, [seekPosition, playerRef,]);

  const chooseBestQuality = useCallback(() => {
    if (video.source === "twitch") {
      const player = playerRef.current.getInternalPlayer();
      const qualities = player.getQualities();
      if (qualities.length > 0) {
        // get best quality that fits in screen
        const screenWidth = window.screen.availWidth,
          scale = window.devicePixelRatio,
          calcWidth = screenWidth * scale;
        console.log("Qualities", qualities);
        console.log(`Screen width=${screenWidth}, scale=${scale}`);
        let bestQuality = null;
        for (const quality of qualities) {
          if (!quality.hasOwnProperty("group")) {
            continue;
          }
          if (quality.group === "auto") {
            continue;
          }

          if (!bestQuality) {
            bestQuality = quality;
          }

          if (quality.width < calcWidth) {
            // quality too low
            break;
          }

          bestQuality = quality;
        }
        if (bestQuality) {
          console.log("Setting twitch quality to ", bestQuality);
          player.setQuality(bestQuality.group);
        }
      }
    }
  }, [playerRef, video]);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);

    return async () => {
      // remove event listeners
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
    };
  }, [onKeyDown, onKeyUp]);

  useEffect(() => {
    return async () => {
      // save position on dismount
      saveProgress("dismount");
    };
  }, [saveProgress, loading]);

  const onProgress = useCallback((state) => {
    // save video position
    if (playerRef.current) {
      const time = playerRef.current.getCurrentTime();
      if (time !== video.position) {
        updateLastAction();
        video.position = time;
      }
    }

    // Update custom-controls state
    if (state) {
      setPlayed(state.played ?? 0);
      setBuffered(state.loaded ?? 0);
    }

    // save to DB every 10s or on pause
    if (Date.now() - lastSaveRef.current >= 10000) {
      saveProgress("progress");
    }
  }, [video, saveProgress, updateLastAction]);

  const onReady = useCallback(
    (event) => {
      console.log("onReady", event);
      if (!hasSeekedRef.current && video) {
        console.log(`Resuming playback at ${video.position}.`);
        setPlayed(video.position / video.duration);
        setVolume(video.volume);
        playerRef.current.seekTo(video.position, "seconds");
        hasSeekedRef.current = true;
      }

      if (!hostedLocal.current) {
        if (video.source === "twitch") {
          const player = playerRef.current.getInternalPlayer();
          // wait for qualities to populate
          const waitForQualities = () => {
            const qualities = player.getQualities();
            if (qualities.length > 0) {
              chooseBestQuality();
            } else {
              setTimeout(waitForQualities, 33);
            }
          };
          waitForQualities();
        }
      }

      lastSaveRef.current = Date.now();
    },
    [video, chooseBestQuality, playerRef, hostedLocal],
  );

  const onPlay = useCallback(() => {
    if (playerRef.current) {
      video.log("onPlay", { position: playerRef.current.getCurrentTime() });
    }
  }, [playerRef, video]);

  const onSeek = useCallback((seconds) => { }, []);

  const onDuration = useCallback((d) => {
    setDuration(d);
  }, []);

  const onPause = useCallback(() => {
    if (playerRef.current) {
      video.position = playerRef.current.getCurrentTime();
      saveProgress("pause");
      video.log("onPause", { position: video.position });
    }
  }, [saveProgress, video, playerRef]);

  const handleContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(
      contextMenu === null
        ? {
          mouseX: event.clientX + 2,
          mouseY: event.clientY - 6,
        }
        : // repeated contextmenu when it is already open closes it with Chrome 84 on Ubuntu
        // Other native context menus might behave different.
        // With this behavior we prevent contextmenu from the backdrop to re-locale existing context menus.
        null,
    );
  };

  const showJumpToTime = useCallback(() => {
    console.log(video.position);
    const i = video.position;
    const hours = Math.floor(i / 3600).toString(),
      minutes = Math.floor((i / 60) % 60).toString(),
      seconds = Math.floor(i % 60).toString();

    setJumpDialog({
      open: true,
      hours: hours,
      minutes: minutes,
      seconds: seconds,
    });
  }, [setJumpDialog, video]);

  const showLog = useCallback(() => {
    setShowLogDialog(true);
  }, [setShowLogDialog]);

  const hideLog = useCallback(() => {
    setShowLogDialog(false);
  }, [setShowLogDialog]);

  const onChangeJump = useCallback(
    (e) => {
      const n = { ...jumpDialog };
      const name = e.target.name;
      let value = e.target.value;

      if (name !== "hours") {
        if (value >= 60) {
          value = 59;
        } else if (value < 0) {
          value = 0;
        }
      }
      n[name] = value;
      setJumpDialog(n);
    },
    [jumpDialog, setJumpDialog],
  );

  const onCloseJump = useCallback(() => {
    setJumpDialog({ ...jumpDialog, open: false });
  }, [jumpDialog, setJumpDialog]);

  const onSubmitJump = useCallback(
    (e) => {
      e.preventDefault();
      const t =
        parseInt(jumpDialog.hours, 10) * 3600 +
        parseInt(jumpDialog.minutes, 10) * 60 +
        parseInt(jumpDialog.seconds, 10);
      onCloseJump();

      // seek to
      playerRef.current?.seekTo(t, "seconds");
    },
    [playerRef, jumpDialog, onCloseJump],
  );

  const handleContextClose = () => {
    setContextMenu(null);
  };

  const handleVideoClick = useCallback((e) => {
    if (!hostedLocal.current) {
      return;
    }
    console.log('handleVideoClick');

    if (e.detail === 1) {
      // Start a timer for the single click action (250ms is standard for double-click detection)
      clickTimerRef.current = setTimeout(() => {
        const state = !playing.current;
        updatePlaying(state);
        hideMouse(state);
        clickTimerRef.current = null;
      }, 250);
    } else if (e.detail === 2) {
      // If a second click happens, clear the pending single-click timer
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      // Perform fullscreen instead
      toggleFullscreen();
    }
  }, [toggleFullscreen, playing, clickTimerRef, hideMouse, updatePlaying]);

  const formatTime = useCallback((secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, []);

  const handleProgressClick = useCallback((e) => {
    if (!progressBarRef.current) return;
    console.log('handleProgressClick');
    const rect = progressBarRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    playerRef.current?.seekTo(fraction, 'fraction');
    setPlayed(fraction);
  }, [progressBarRef, playerRef]);

  const handleProgressHoverStart = useCallback(() => {
    hoverActiveRef.current = true;
    if (storyboardRef.current && previewRef.current) {
      previewRef.current.style.display = 'flex';
    }
  }, []);

  const handleProgressHoverEnd = useCallback(() => {
    hoverActiveRef.current = false;
    if (previewRef.current) {
      previewRef.current.style.display = 'none';
    }
  }, []);

  const handleProgressHover = useCallback((e) => {
    const sb = storyboardRef.current;
    const preview = previewRef.current;
    const thumb = thumbRef.current;
    const bar = progressBarRef.current;
    if (!sb || !preview || !thumb || !bar || !duration) {
      return;
    }
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const time = (x / rect.width) * duration;

    const frame = findStoryboardFrame(sb, time);
    if (!frame) {
      return;
    }
    preview.style.display = 'flex';

    // show the right sheet (object URLs are created lazily and cached)
    if (lastSheetRef.current !== frame.sheet) {
      lastSheetRef.current = frame.sheet;
      if (!sb.urls[frame.sheet]) {
        const { offset, size } = sb.sheets[frame.sheet];
        sb.urls[frame.sheet] = URL.createObjectURL(
          new Blob([sb.arrayBuffer.slice(offset, offset + size)], { type: 'image/jpeg' }),
        );
      }
      thumb.style.backgroundImage = `url('${sb.urls[frame.sheet]}')`;
    }

    // size of one frame, the whole sheet, and the offset of the wanted frame inside it
    const fw = sb.width * SBB_SCALE, fh = sb.height * SBB_SCALE;
    thumb.style.width = `${fw}px`;
    thumb.style.height = `${fh}px`;
    thumb.style.backgroundSize = `${fw * sb.columns}px ${fh * sb.rows}px`;
    thumb.style.backgroundPosition = `${-frame.x * fw}px ${-frame.y * fh}px`;

    if (previewTimeRef.current) {
      previewTimeRef.current.textContent = formatTime(time);
    }

    // centre on the mouse, but keep it inside the bar
    const pw = preview.offsetWidth;
    preview.style.left = `${Math.max(0, Math.min(rect.width - pw, x - pw / 2))}px`;
  }, [duration, formatTime, progressBarRef]);

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    console.log("setVolume", v);
    setVolume(v);
    setMuted(v === 0);
    video.volume = v;
  };

  const toggleMute = () => {
    setMuted((prev) => !prev);
  };

  if (loading || (!video && !notFound)) {
    return <Loading style={{ paddingTop: "50px" }} />;
  }

  return (
    <PlayerContext.Provider
      value={{ video, playing, showJumpToTime, showLog }}
    >
      <div
        key={`player-page-${video ? video.uuid : "none"}`}
        className="page page-video"
        onContextMenu={handleContextMenu}
      >
        {video && (
          <>
            <Grid container spacing={2}>
              <Grid item sm={8}>
                <Box
                  key="player"
                  sx={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    objectFit: "scale-down",
                    overflow: "hidden",
                  }}
                >
                  <div
                    ref={playerContainerRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      cursor: mouseVisible ? 'default' : 'none',
                      position: 'relative',
                      ...(isFullscreen && stretchMode
                        ? {
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'flex-start',
                          background: '#000',
                        }
                        : {}),
                    }}
                    onClick={handleVideoClick}
                  >
                    {/* Video box: constrained to the top 75% of the screen (centered) when
                        Stretch Mode is active in fullscreen; otherwise fills the container. */}
                    <div
                      style={
                        isFullscreen && stretchMode
                          ? {
                            position: 'relative',
                            height: '75vh',
                            maxWidth: '100%',
                            aspectRatio: '16 / 9',
                          }
                          : {
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                          }
                      }
                    >
                      <ReactPlayer
                        ref={playerRef}
                        url={videoUrl}
                        playing={isPlaying}
                        controls={!!video.controls && !hostedLocal.current}
                        volume={volume}
                        muted={muted}
                        onReady={onReady}
                        onPlay={onPlay}
                        onSeek={onSeek}
                        onPause={onPause}
                        onProgress={onProgress}
                        onDuration={onDuration}
                        progressInterval={250}
                        width="100%"
                        height="100%"
                        loop={false}
                        style={{ objectFit: 'contain' }}
                      />

                      {hostedLocal.current && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                            padding: '24px 12px 10px',
                            opacity: video.controls && controlsVisible ? 1 : 0,
                            transition: 'opacity 0.25s ease',
                            pointerEvents: video.controls && controlsVisible ? 'auto' : 'none',
                            userSelect: 'none',
                          }}
                        >
                          <ProgressBar
                            played={played}
                            buffered={buffered}
                            duration={duration}
                            progressBarRef={progressBarRef}
                            onProgressClick={handleProgressClick}
                            formatTime={formatTime}
                            previewRef={previewRef}
                            thumbRef={thumbRef}
                            previewTimeRef={previewTimeRef}
                            onHoverStart={handleProgressHoverStart}
                            onHover={handleProgressHover}
                            onHoverEnd={handleProgressHoverEnd}
                          />

                          {/* Bottom row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Play / Pause */}
                            <button
                              onClick={() => { updatePlaying(!isPlaying); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 0 }}
                              title={isPlaying ? 'Pause (k)' : 'Play (k)'}
                            >
                              {isPlaying ? <PauseIcon /> : <PlayIcon />}
                            </button>

                            {/* Volume */}
                            <button
                              onClick={toggleMute}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 0 }}
                              title={muted ? 'Unmute' : 'Mute'}
                            >
                              {muted || volume === 0 ? <VolumeMuteIcon /> : <VolumeHighIcon />}
                            </button>
                            <input
                              type="range"
                              min={0} max={1} step={0.02}
                              value={muted ? 0 : volume}
                              onChange={handleVolumeChange}
                              style={{
                                width: '72px',
                                accentColor: '#fff',
                                cursor: 'pointer',
                              }}
                            />

                            {/* Time */}
                            <TimeDisplay played={played} duration={duration} formatTime={formatTime} />

                            {/* Spacer */}
                            <div style={{ flex: 1 }} />

                            {/* Stretch Mode */}
                            <button
                              onClick={toggleStretchMode}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 0 }}
                              title={stretchMode ? 'Stretch Mode: On (s)' : 'Stretch Mode: Off (s)'}
                            >
                              {stretchMode ? <StretchModeActiveIcon /> : <StretchModeIcon />}
                            </button>

                            {/* Fullscreen */}
                            <button
                              onClick={toggleFullscreen}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 0 }}
                              title="Fullscreen (f)"
                            >
                              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Snackbar
                      anchorOrigin={{ vertical: "top", horizontal: "right" }}
                      open={snack.open}
                      message={snack.message}
                      key="snackbar-player"
                    />
                  </div>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      mt: 1,
                      mb: 1,
                      fontWeight: "bold",
                      textAlign: "left",
                      fontSize: "1.2rem",
                    }}
                  >
                  </Typography>
                </Box>
                {video.description && (
                  <Card
                    variant="outlined"
                    sx={{
                      textAlign: "left",
                      color: "#ccc",
                      whiteSpace: "pre-line",
                      p: 2,
                    }}
                  >
                    <Typography sx={{}}>{video.description}</Typography>
                  </Card>
                )}
              </Grid>
              <Grid item sm={4}>
                <VideoList key="videolist" currentVideo={video} />
              </Grid>
            </Grid>
            <Dialog open={jumpDialog?.open} onClose={onCloseJump} maxWidth="xs">
              <form onSubmit={onSubmitJump}>
                <DialogTitle>Jump to Time</DialogTitle>
                <DialogContent>
                  <FormGroup>
                    <Grid container spacing={2}>
                      <Grid item sm={4}>
                        <TextField
                          name="hours"
                          autoFocus
                          onChange={onChangeJump}
                          label="Hours"
                          size="small"
                          onFocus={(e) => {
                            e.target.select();
                          }}
                          sx={{ mt: 0.75, input: { textAlign: "right" } }}
                          value={jumpDialog?.hours}
                        />
                      </Grid>
                      <Grid item sm={4}>
                        <TextField
                          name="minutes"
                          onChange={onChangeJump}
                          label="Minutes"
                          size="small"
                          onFocus={(e) => {
                            e.target.select();
                          }}
                          sx={{ mt: 0.75, input: { textAlign: "right" } }}
                          value={jumpDialog?.minutes}
                        />
                      </Grid>
                      <Grid item sm={4}>
                        <TextField
                          name="seconds"
                          onChange={onChangeJump}
                          label="Seconds"
                          size="small"
                          onFocus={(e) => {
                            e.target.select();
                          }}
                          sx={{ mt: 0.75, input: { textAlign: "right" } }}
                          value={jumpDialog?.seconds}
                        />
                      </Grid>
                    </Grid>
                  </FormGroup>
                </DialogContent>
                <DialogActions>
                  <Button onClick={onCloseJump}>Cancel</Button>
                  <Button type="submit">Go</Button>
                </DialogActions>
              </form>
            </Dialog>
            {showLogDialog && <LogDialog video={video} onClose={hideLog} />}
            <PlayerContextMenu
              contextMenu={contextMenu}
              onClose={handleContextClose}
            />
          </>
        )}
        {notFound && <Alert severity="warning">Video {uuid} not found.</Alert>}
      </div>
    </PlayerContext.Provider>
  );
}