/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useEffect, useState, } from 'react';
import { Dialog, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Grid, AppBar, Toolbar, Typography, Slide, } from '@mui/material';
import { getDatabase } from '../database/Database';

import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function LogDialog({video, onClose}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      // get data
      const results = await getDatabase().get('logs', '*', {where: [['video_id', '=', video.uuid]], orderBy: [['created_at', 'desc']]});

      let nRows = [];
      for (let i in results) {
        const log = results[i];
        const { uuid, action } = log;
        
        // firebase returns a timestamp object, indexddb returns a Date object
        let created_at;
        if ('seconds' in log.created_at) {
          const dt = new Date(log.created_at.seconds * 1000);
          created_at = dt.toString();
        } else {
          created_at = log.created_at.toString();
        }

        let data = '';
        if (action === 'create') {
          data = (<a href={log.data.url} target="_blank" rel="noreferrer">{log.data.url}</a>);
        } else {
          // parse time
          const p = log.data.position;
          const hours = Math.floor(p / 3600).toString(),
            minutes = Math.floor((p / 60) % 60).toString(),
            seconds = Math.round(p % 60).toString();
          if (hours > 0) {
            data = hours.padStart(2, '0') + ':';
          }
          data += minutes.padStart(2, '0') + ':' + seconds.padStart(2, '0');  
        }
        
        nRows.push({
          uuid,
          action,
          data,
          created_at,
        });
      }
      setLoading(false);
      setRows(nRows);
    };
    load();
  }, [setLoading, video,]);

  return (
    <Dialog open={true} onClose={onClose} fullScreen TransitionComponent={Transition}>
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Video Log - {video.title}
          </Typography>
        </Toolbar>
      </AppBar>
      {loading && (
        <Grid container justify = "center">
          <CircularProgress sx={{ margin: '0 auto' }} />
        </Grid>
      )}
      {!loading && (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Date Time</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Position</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.uuid}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>{row.created_at}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.data}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Dialog>
  );
};