/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useContext, } from 'react';

import VideoListItem from '../components/VideoListItem';
import VideosContext from '../contexts/VideosContext';

export default function VideoList({ currentVideo, }) {
  const { videos } = useContext(VideosContext);

  //console.log(currentVideo, videos);
  
  return (
    <>
      {videos.map((video, index) => {
        return <VideoListItem key={`listitem-${video.uuid}`} index={index} video={video} active={currentVideo.uuid === video.uuid} />;
      })}
    </>
  );
};