/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useContext, useState, useEffect, } from 'react';

import { Card, Box, CardMedia, Typography, LinearProgress, Grow, Chip, } from '@mui/material';
import { useNavigate } from "react-router-dom";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import VideoContextMenu from './VideoContextMenu';

import VideosContext from '../contexts/VideosContext';

const humanFileSize = (size) => {
  var i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (size / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

export default function VideoComponent({ video, index, dragIndex, dragDirection, onDragStart, onDragEnd, onDragEnter, onDragLeave, }) {
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState(null);
  const { autoplayRef, } = useContext(VideosContext);
  const [ytdlpProgress, setYtdlpProgress] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      // check for updates
      if (video.ytdlpProgress !== ytdlpProgress) {
        setYtdlpProgress(video.ytdlpProgress);
      }
    }, 42);

    // Cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }, [ytdlpProgress, setYtdlpProgress, video,]);

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

  const handleContextClose = () => {
    setContextMenu(null);
  };
  
  const playVideo = (event) => {
    // component has been clicked
    autoplayRef.current = true;
    navigate('/player/' + video.uuid);
  };

  let progress = 100, color;
  // determine progress from how much we have watched
  progress = Math.round(video.position / video.duration * 10000) * 0.01;
  color = 'error';

  let duration = '';
  let i = video.duration;
  const hours = Math.floor(i / 3600).toString(),
    minutes = Math.floor((i / 60) % 60).toString(),
    seconds = (i % 60).toString();
  if (hours > 0) {
    duration = hours.padStart(2, '0') + ':';
  }
  duration += minutes.padStart(2, '0') + ':' + seconds.padStart(2, '0');

  if (!video.controls) {
    duration = null;
    progress = 0;
  }

  return (
    <div 
      onContextMenu={handleContextMenu}
      data-index={ index }
      className={ 'video-drag-target' + (dragIndex === index ? (dragDirection === 'up' ? ' drag-active-up' : ' drag-active-down') : '') }
      draggable="true"
      data-video-uuid={ video.uuid }
      onDragStart={ onDragStart }
      onDragEnd={ onDragEnd }
      onDragEnter={ onDragEnter }
      onDragLeave={ onDragLeave }
    >
      <div onClick={playVideo}>
        <Grow key={video.uuid} in={true}>
          <Box className="video-card" sx={{borderRadius: '15px', overflow: 'hidden', backgroundColor: '#000', }}>
            {video.ytdlpComplete === 0 && 
              <LinearProgress className="videoPlayerProgress" color="success" variant="determinate" value={Math.max(0, ytdlpProgress) * 100} />}
            <Card sx={{position: 'relative'}}>
              <Box className="cover">
                <Box className="center">
                  <PlayArrowIcon fontSize="large" />
                </Box>
              </Box>
              <CardMedia
              sx={{ aspectRatio: '16 /9', objectFit: 'cover', overflow: 'hidden', }}
                component="img"
                image={video.getThumbnailUrl(480, 270)}
                alt={video.title}
              />
              <Box sx={{ position: 'absolute', right: 8, bottom: 8, fontSize: '0.8rem', borderRadius: 2, backgroundColor: 'black', p: 0.25, pl: 0.75, pr: 0.75 }}>{duration}</Box>
            </Card>
            <Typography sx={{ m: 2, textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', }}>{video.title}</Typography>

            {video.ytdlpComplete === 0 &&
              <FileDownloadIcon fontSize="small" sx={{ position: 'absolute', left: '10px', top: '10px' }} />}
            {video.ytdlpComplete === 0 &&
              <Chip label={humanFileSize(video.ytdlpSpeed) + '/s'} variant="outlined" sx={{ position: 'absolute', left: '32px', top: '10px' }} />}
            {video.ytdlpComplete === 1 &&
              <DownloadDoneIcon fontSize="small" sx={{ position: 'absolute', left: '10px', top: '10px' }} />}

            {progress > 0 &&
              <LinearProgress className="videoPlayerProgress" color={color} variant="determinate" value={progress} />}
            {progress <= 0 &&
              <LinearProgress className="videoPlayerProgress" color="none" variant="determinate" value={100} />}
          </Box>
        </Grow>
      </div>
      <VideoContextMenu video={video} contextMenu={contextMenu} onClose={handleContextClose} />
    </div>
  );
}