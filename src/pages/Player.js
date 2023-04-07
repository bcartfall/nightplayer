/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useCallback, useContext, useEffect, useRef, useState, } from 'react';
import ReactPlayer from 'react-player'
import { useParams } from "react-router-dom";
import { Box, Alert, Grid, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, FormGroup, } from '@mui/material';

import LayoutContext from '../contexts/LayoutContext';
import VideosContext from '../contexts/VideosContext';
import PlayerContext from '../contexts/PlayerContext';

import PlayerContextMenu from '../components/PlayerContextMenu';
import VideoList from '../components/VideoList';
import Loading from '../components/Loading';

export default function Player(props) {
  const { setTitle } = useContext(LayoutContext);
  const { videos, saveVideo, loading } = useContext(VideosContext);
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const progressRef = useRef(null);
  const lastSaveRef = useRef(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [jumpDialog, setJumpDialog] = useState(null);

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

  const handleContextMenu = (event) => {
    event.preventDefault();
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

  const onChangeJump = useCallback((e) => {
    const n = {...jumpDialog};
    const name = e.target.name;
    let value = e.target.value;

    if (name !== 'hours') {
      if (value >= 60) {
        value = 59;
      } else if (value < 0) {
        value = 0;
      }
    }
    n[name] = value;
    setJumpDialog(n);
  }, [jumpDialog, setJumpDialog]);

  const onCloseJump = useCallback(() => {
    setJumpDialog({...jumpDialog, open: false});
  }, [jumpDialog, setJumpDialog]);

  const onSubmitJump = useCallback((e) => {
    e.preventDefault();
    const t = (parseInt(jumpDialog.hours, 10) * 3600) + (parseInt(jumpDialog.minutes, 10) * 60) + parseInt(jumpDialog.seconds, 10);
    onCloseJump();

    // seek to
    playerRef.current?.seekTo(t, 'seconds');
  }, [playerRef, jumpDialog, onCloseJump,]);

  const handleContextClose = () => {
    setContextMenu(null);
  };

  if (loading) {
    return (<Loading />);
  }

  return (
    <PlayerContext.Provider value={{ video, playing, setPlaying, showJumpToTime, }}>
      <div key={`player-page-${video ? video.uuid : 'none'}`} className="page page-video" onContextMenu={handleContextMenu}>
        {video && (
          <>
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
            <Dialog open={jumpDialog?.open} onClose={onCloseJump} maxWidth="xs">
              <form onSubmit={onSubmitJump}>
                <DialogTitle>Jump to Time</DialogTitle>
                <DialogContent>
                  <FormGroup>
                    <Grid container spacing={2}>
                      <Grid item sm={4}>
                        <TextField name="hours" autoFocus onChange={onChangeJump} label="Hours" size="small" onFocus={e => {e.target.select()}} sx={{mt: 0.75, input: {textAlign: "right" }}} value={jumpDialog?.hours} />
                      </Grid>
                      <Grid item sm={4}>
                        <TextField name="minutes" onChange={onChangeJump} label="Minutes" size="small" onFocus={e => {e.target.select()}} sx={{mt: 0.75, input: {textAlign: "right"}}} value={jumpDialog?.minutes} />
                      </Grid>
                      <Grid item sm={4}>
                        <TextField name="seconds" onChange={onChangeJump} label="Seconds" size="small" onFocus={e => {e.target.select()}} sx={{mt: 0.75, input: {textAlign: "right"}}} value={jumpDialog?.seconds} />
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
            <PlayerContextMenu contextMenu={contextMenu} onClose={handleContextClose} />
          </>
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