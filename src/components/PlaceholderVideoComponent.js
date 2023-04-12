/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React from 'react';

import { Card, Box, Typography, } from '@mui/material';

export default function PlaceholderVideoComponent(props) {
  return (
    <Box className="video-card" sx={{borderRadius: '15px', overflow: 'hidden', backgroundColor: '#000', cursor: 'default', }}>
      <Card sx={{position: 'relative'}}>
        <Box sx={{ aspectRatio: '16 / 9' }} />
        <Box sx={{ position: 'absolute', right: 8, bottom: 8, minWidth: '75px', minHeight: '20px', fontSize: '0.8rem', borderRadius: 2, backgroundColor: 'black', p: 0.25, pl: 0.75, pr: 0.75 }}></Box>
      </Card>
      <Typography sx={{m: 2, textOverflow: 'ellipsis', display: 'block', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', color: 'rgba(0, 0, 0, 0)', }}>Lorem ipsum dolor sit amet.</Typography>
    </Box>
  );
}