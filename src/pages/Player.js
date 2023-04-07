/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useCallback, useContext, useEffect, useRef, useState, } from 'react';
import ReactPlayer from 'react-player'
import { useParams } from "react-router-dom";
import { Box, Alert, Grid, Card, Typography, } from '@mui/material';

import LayoutContext from '../contexts/LayoutContext';
import VideosContext from '../contexts/VideosContext';
import PlayerContext from '../contexts/PlayerContext';

import VideoList from '../components/VideoList';
import Loading from '../components/Loading';

export default function Player(props) {
  const { setTitle } = useContext(LayoutContext);
  const { videos, saveVideo, loading } = useContext(VideosContext);
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const progressRef = useRef(null);
  const lastSaveRef = useRef(0);

  // get active video
  let { uuid } = useParams(); // get id from url (e.g. /player/:uuid)

  const [video, setVideo] = useState(null);

  useEffect(() => {
    // change title
    if (video) {
      setTitle((video.title ?? 'Video Title Not Found'));
    }
  }, [setTitle, video, ]);

  useEffect(() => {
    // set current video
    let video = null;
    for (const item of videos) {
      if (item.uuid === uuid) {
        video = item;
        break;
      }
    }
    setVideo(video);
  }, [uuid, videos]);

  const saveProgress = useCallback(() => {
    if (!video) {
      return;
    }
    lastSaveRef.current = Date.now();
    saveVideo(video);
  }, [video, saveVideo]);

  useEffect(() => {
    if (playerRef.current != null) {
      setPlaying(true); // autoplay on electron
    }

    return async () => {
      if (progressRef.current) {
        console.log('Clearing progress interval.');
        clearInterval(progressRef.current);
      }

      // save position on dismount
      saveProgress();
    };
  }, [playerRef, setVideo, saveProgress]);

  const onProgress = useCallback(() => {
    // save video position
    if (playerRef.current) {
      const time = playerRef.current.getCurrentTime();
      //console.log('onProgress', time);
      video.position = time;
    }

    // save to DB every 10s or on pause
    if (Date.now() - lastSaveRef.current >= 10000) {
      saveProgress();
    }
  }, [video, saveProgress]);

  const onReady = useCallback((event) => {
    console.log('onReady', event);
    setPlaying(true);
    console.log(`Resuming playback at ${video.position}.`);
    playerRef.current.seekTo(video.position, 'seconds');

    if (progressRef.current) {
      console.log('Clearing progress interval.');
      clearInterval(progressRef.current);
    }
    console.log('Setting progress interval.');
    progressRef.current = setInterval(onProgress, 33);
    lastSaveRef.current = Date.now();
  }, [setPlaying, video, onProgress]);

  const onPause = useCallback(() => {
    if (playerRef.current) {
      video.position = playerRef.current.getCurrentTime();
      saveProgress();
    }
  }, [saveProgress, video, playerRef]);

  const onPlay = useCallback(() => {
  }, []);

  if (loading) {
    return (<Loading />);
  }

  return (
    <PlayerContext.Provider value={{ video, }}>
      <div key={`player-page-${video ? video.uuid : 'none'}`} className="page page-video">
        {video && (
          <Grid container spacing={2}>
            <Grid item sm={8}>
              <Box key="player" sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'scale-down', overflow: 'hidden', }}>
                <ReactPlayer 
                  ref={playerRef} 
                  url={video.url ?? ''}
                  playing={playing}
                  controls={!!video.controls}
                  onReady={onReady}
                  onPause={onPause}
                  onPlay={onPlay}
                  width='100%'
                  height='100%'
                />
              </Box>
              <Box>
                <Typography sx={{ mt: 1, mb: 1, fontWeight: 'bold', textAlign: 'left', fontSize: '1.2rem' }}>
                  {video.title}
                </Typography>
              </Box>
              {video.description && (
                <Card variant="outlined" sx={{ textAlign: 'left', color: '#ccc', whiteSpace: 'pre-line', p: 2 }}>
                  <Typography sx={{}}>
                    {video.description}
                  </Typography>
                </Card>
              )}
            </Grid>
            <Grid item sm={4}>
              <VideoList key="videolist" currentVideo={video} />
            </Grid>
          </Grid>
        )}
        {!video && (
          <Alert severity="warning">
            Video {uuid} not found.
          </Alert>
        )}
      </div>
    </PlayerContext.Provider>
  );
}