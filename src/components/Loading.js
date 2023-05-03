/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React from 'react';
import { Typography, CircularProgress, Grid } from '@mui/material';
import PlaceholderVideoComponent from './PlaceholderVideoComponent';

export default function Loading({style, page}) {
  if (page === 'main') {
    // video component placeholders
    const number_of_videos = localStorage.getItem('number_of_videos') || 6;
    
    let elements = [];
    for (let i=0; i<number_of_videos; i++) {
      elements.push((
        <Grid item sm={3} key={`video-grid-placeholder-${i}`}>
          <PlaceholderVideoComponent key={`video-{$i}`} />
        </Grid>
      ));
    }

    return (
      <Grid container spacing={2} sx={{ maxWidth: '1200px' }}>
        { elements }
      </Grid>
    );
  } else {
    // circular progress
    return (
      <div style={style}>
        <CircularProgress />
        <Typography sx={{mt: 2}}>Loading...</Typography>
      </div>
    );
  }
};