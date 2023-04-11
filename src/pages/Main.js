/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useCallback, useContext, useEffect, useState, } from 'react';
import { Alert, Grid, } from '@mui/material';

import VideoComponent from '../components/VideoComponent';
import Loading from '../components/Loading';

import LayoutContext from '../contexts/LayoutContext';
import VideosContext from '../contexts/VideosContext';

export default function Main(props) {
  const { setTitle } = useContext(LayoutContext);
  const { loading, videos, changeVideoOrder } = useContext(VideosContext);
  const [dragVideo, setDragVideo] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    // change title
    setTitle("Videos");
  }, [ setTitle, ]);

  const onDragStart = useCallback((e) => {
    console.log('onDragStart', e);

    // set dragging video
    const uuid = e.target.dataset.videoUuid;
    const index = parseInt(e.target.dataset.index);
    
    let video = null;
    for (const t of videos) {
      if (t.uuid === uuid) {
        video = t;
        break;
      }
    }
    setDragVideo({
      video,
      index,
    });
  }, [setDragVideo, videos]);

  const onDragEnd = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!dragIndex) {
      return;
    }
    console.log('onDragEnd setting position of video', dragVideo, ' to ', dragIndex);

    changeVideoOrder(dragVideo.video, dragVideo.index, dragIndex.index);
    
    setDragIndex(null);
    setDragVideo(null);
  }, [setDragVideo, setDragIndex, dragIndex, dragVideo, changeVideoOrder,]);

  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target.closest(".video-drag-target");
    if (!target) {
      return;
    }
    if (!dragVideo) {
      return;
    }

    const index = parseInt(target.dataset.index, 10);
    if (index === dragVideo?.index) {
      setDragIndex(null);
      return;
    }

    const direction = index > dragVideo?.index ? 'down' : 'up';
    setDragIndex({index, direction});
  }, [setDragIndex, dragVideo,]);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    //console.log('onDragLeave', e);
  }, []);

  
  return (
    <div className="page">
      {loading && (
        <Loading />
      )}
      {!loading && (
        <>
          {videos?.length === 0 && (
            <Alert severity="warning">
              No videos found. Drag and drop video URLs or use the add video button to add videos.
            </Alert>
          )}
          <Grid container spacing={2}>
            {videos?.map((item, index) => {
              return (
                <Grid item sm={4} key={`video-grid-${item.uuid}`}>
                  <VideoComponent key={`video-${item.uuid}`} index={index} dragIndex={dragIndex?.index} dragDirection={dragIndex?.direction} video={item} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragEnter={onDragEnter} onDragLeave={onDragLeave} />
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
    </div>
  );
}