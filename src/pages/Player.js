/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useCallback, useContext, useEffect, useRef, useState, } from 'react';
import ReactPlayer from 'react-player';
import { useParams, useNavigate, } from "react-router-dom";
import { Box, Alert, Grid, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, FormGroup, Snackbar, } from '@mui/material';

import LayoutContext from '../contexts/LayoutContext';
import VideosContext from '../contexts/VideosContext';
import PlayerContext from '../contexts/PlayerContext';

import PlayerContextMenu from '../components/PlayerContextMenu';
import VideoList from '../components/VideoList';
import Loading from '../components/Loading';

export default function Player(props) {
  const { setTitle, } = useContext(LayoutContext);
  const { videos, saveVideo, loading } = useContext(VideosContext);
  const navigate = useNavigate();
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const [snack, setSnack] = useState({open: false, message: ''});
  const [playing, setPlaying] = useState(false);
  const lastSaveRef = useRef(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [jumpDialog, setJumpDialog] = useState({open: false});
  const seekPosition = useRef(0);

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

    setPlaying(true);
  }, [uuid, videos, setVideo, setPlaying,]);

  const saveProgress = useCallback((source) => {
    if (!video) {
      return;
    }
    //console.log('Saving video', source);
    lastSaveRef.current = Date.now();
    saveVideo(video);
  }, [video, saveVideo]);

  const skip = useCallback((d) => {
    let index = -1;
    const l = videos.length;
    for (let i=0;i<l;i++) {
      if (video.uuid === videos[i].uuid) {
        index = i;
        break;
      }
    }
    if (index >= -1 && index + d < l && index + d >= 0) {
      navigate('/player/' + videos[index + d].uuid);
    }
  }, [videos, video, navigate,]);

  const onKeyDown = useCallback((e) => {
    //console.log('onKeyDown', e);

    const key = e.key.toUpperCase();
    switch (key) {
      case 'ARROWLEFT':
        seekPosition.current -= 5;
        setSnack({
          open: true,
          message: `Seeking ${seekPosition.current} seconds.`,
        });
        return true;
      case 'ARROWRIGHT': 
        seekPosition.current += 5;
        setSnack({
          open: true,
          message: `Seeking +${seekPosition.current} seconds.`,
        });
        return true;
      case 'F': 
        // fullscreen
        e.preventDefault();

        if (!document.fullscreenElement) {
          // enter fullscreen
          //const iframe = findDOMNode(playerRef.current?.player).getElementsByTagName('iframe')[0];
          //iframe.requestFullscreen();
          playerContainerRef.current.requestFullscreen();
        } else {
          // exit fullscreen
          document.exitFullscreen();
        }
        return true;
      case ' ': 
      case 'K':
        e.preventDefault();
        // play / pause
        let message = playing ? 'Pausing.' : 'Playing.';
        setSnack({open: true, message,});
        setPlaying(!playing);
        setTimeout(() => {
          setSnack({open: false, message,});
        }, 500);
        return true;
      default:
    }

    if (e.shiftKey) {
      switch (key) {
        case 'N':
          // go to next video
          return skip(1);
        case 'P':
          // go to previous video
          return skip(-1);
        default:
      }
    }
  }, [playing, setPlaying, seekPosition, setSnack, playerContainerRef, skip,]);

  const onKeyUp = useCallback(() => {
    if (seekPosition.current !== 0) {
      console.log('seeking', seekPosition.current, video.position + seekPosition.current);
      playerRef.current?.seekTo(video.position + seekPosition.current, 'seconds');
      setTimeout(() => {
        setSnack({...snack, open: false,});
      }, 500);
    }
    seekPosition.current = 0;
  }, [seekPosition, video, playerRef, snack, setSnack,]);
  
  const chooseBestQuality = useCallback(() => {
    if (video.source === 'twitch') {
      const player = playerRef.current.getInternalPlayer();
      const qualities = player.getQualities();
      if (qualities.length > 0) {
        // get best quality that fits in screen
        const screenWidth = window.screen.availWidth;
        console.log('Qualities', qualities);
        console.log('Screen width=', screenWidth);
        let bestQuality = null;
        for (const quality of qualities) {
          if (!quality.hasOwnProperty('group')) {
            continue;
          }
          if (quality.group === 'auto') {
            continue;
          }

          if (!bestQuality) {
            bestQuality = quality;
          }

          if (quality.width < screenWidth) {
            // quality too low
            break;
          }

          bestQuality = quality;
        }
        if (bestQuality) {
          console.log('Setting twitch quality to ', bestQuality);
          player.setQuality(bestQuality.group);
        }
      }
    }
  }, [playerRef, video,]);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);

    return async () => {
      // remove event listeners
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
    };
  }, [onKeyDown, onKeyUp,]);

  useEffect(() => {
    return async () => {
      // save position on dismount
      saveProgress('dismount');
    };
  }, [saveProgress]);

  const onProgress = useCallback(() => {
    // save video position
    if (playerRef.current) {
      //console.log('onProgress', playerRef.current.getCurrentTime());
      const time = playerRef.current.getCurrentTime();
      video.position = time;
    }

    // save to DB every 10s or on pause
    if (Date.now() - lastSaveRef.current >= 10000) {
      saveProgress('progress');
    }
  }, [video, saveProgress,]);

  const onReady = useCallback((event) => {
    console.log('onReady', event);
    console.log(`Resuming playback at ${video.position}.`);
    playerRef.current.seekTo(video.position, 'seconds');

    if (video.source === 'twitch') {
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

    lastSaveRef.current = Date.now();
  }, [video, chooseBestQuality,]);

  const onPause = useCallback(() => {
    if (playerRef.current) {
      video.position = playerRef.current.getCurrentTime();
      saveProgress('pause');
    }
  }, [saveProgress, video, playerRef,]);

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
                  <div ref={playerContainerRef} style={{width: '100%', height: '100%'}}>
                    <ReactPlayer 
                      ref={playerRef} 
                      url={video.url ?? ''}
                      playing={playing}
                      controls={!!video.controls}
                      onReady={onReady}
                      onPause={onPause}
                      onProgress={onProgress}
                      progressInterval={1000}
                      width='100%'
                      height='100%'
                    />
                    <Snackbar
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                      open={snack.open}
                      message={snack.message}
                      key="snackbar-player"
                    />
                  </div>
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