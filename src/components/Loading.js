/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React from 'react';
import { Typography, CircularProgress, } from '@mui/material';

export default function Loading(props) {
  return (
    <div style={props?.style}>
      <CircularProgress />
      <Typography sx={{mt: 2}}>Loading...</Typography>
    </div>
  );
};