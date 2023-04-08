/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useContext, useState, } from 'react';

import { Card, Box, CardContent, CardMedia, Typography, LinearProgress, Grow } from '@mui/material';
import { useNavigate } from "react-router-dom";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VideoContextMenu from './VideoContextMenu';

import VideosContext from '../contexts/VideosContext';

export default function VideoComponent({ video, index, dragIndex, dragDirection, onDragStart, onDragEnd, onDragEnter, onDragLeave, }) {
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState(null);
  const { autoplayRef, } = useContext(VideosContext);

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
          <Card sx={{ display: 'flex', mb: 2 }} className="video-component">
            <Box sx={{ position: 'relative', width: '30%', display: 'inherited', flexDirection: 'column' }}>
              <Box className="cover">
                <Box className="center">
                  <PlayArrowIcon fontSize="large" />
                </Box>
              </Box>
              <CardMedia
                component="img"
                image={video.getThumbnailUrl(320, 240)}
                alt={video.title}
              />
              <Box sx={{ position: 'absolute', right: 8, bottom: 8, fontSize: '0.8rem', borderRadius: 2, backgroundColor: 'black', p: 0.25, pl: 0.75, pr: 0.75 }}>{duration}</Box>
            </Box>
            <Box sx={{ width: '70%', display: 'flex', flexDirection: 'column' }} className="content">
              <CardContent sx={{ flex: '1 0 auto' }}>
                <Typography component="div" className="title" variant="h6">
                  {video.title}
                </Typography>
                <Typography component="div" sx={{color: '#aaa'}}>
                  {video.url}
                </Typography>
              </CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, pb: 1 }}>
                <Typography className="description" sx={{ overflow: 'hidden', maxHeight: 76, color: '#aaa' }}>
                  {video.description}
                </Typography>
              </Box>
              {progress > 0 &&
                <LinearProgress className="videoPlayerProgress" color={color} variant="determinate" value={progress} />}
            </Box>
          </Card>
        </Grow>
      </div>
      <VideoContextMenu video={video} contextMenu={contextMenu} onClose={handleContextClose} />
    </div>
  );
}