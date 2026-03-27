/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useCallback, useContext, useState, useEffect, useImperativeHandle, forwardRef, } from 'react';
import { Outlet, Link } from "react-router-dom";

import { AppBar, Toolbar, Typography, useScrollTrigger, Box, Fab, Fade, IconButton, DialogActions, Button, DialogTitle, DialogContent, DialogContentText, TextField, Dialog, Snackbar, Alert, FormControlLabel, FormGroup, Checkbox, } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import SettingsIcon from '@mui/icons-material/Settings';
import AddLinkIcon from '@mui/icons-material/AddLink';

import LayoutContext from '../contexts/LayoutContext';
import VideosContext from '../contexts/VideosContext';
import { isVideoUrl } from "../models/Video";

function ScrollTop(props) {
  const { children, window } = props;
  // Note that you normally won't need to set the window ref as useScrollTrigger
  // will default to window.
  // This is only being set here because the demo is in an iframe.
  const trigger = useScrollTrigger({
    target: window ? window() : undefined,
    disableHysteresis: true,
    threshold: 100,
  });

  const handleClick = (event) => {
    const anchor = (event.target.ownerDocument || document).querySelector(
      '#back-to-top-anchor',
    );

    if (anchor) {
      anchor.scrollIntoView({
        block: 'center',
      });
    }
  };

  return (
    <Fade in={trigger}>
      <Box
        onClick={handleClick}
        role="presentation"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        {children}
      </Box>
    </Fade>
  );
}

const Layout = forwardRef((props, ref) => {
  const { title, error, snack, } = useContext(LayoutContext);
  const { addVideoUrl, settings } = useContext(VideosContext);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [hideControls, setHideControls] = useState(false);
  const [addBottom, setAddBottom] = useState(false);
  const [downloadImmediately, setDownloadImmediately] = useState(false);
  const [showGettingVideo, setShowGettingVideo] = useState(false);

  useImperativeHandle(ref, () => ({
    // This is the method exposed to the parent
    pasteUrl(url) {
      setAddBottom(true);
      setAddUrl(url);
      setShowAddVideo(true);
    }
  }));

  const pasteVideo = useCallback((url, addBottom) => {
    setAddBottom(addBottom);
    setAddUrl(url);
    setShowAddVideo(true);
  }, [setAddBottom, setAddUrl, setShowAddVideo]);

  const onKeyDown = useCallback(
    async (e) => {
      console.log("onKeyDown", e);

      const key = e.key.toUpperCase();

      // Ctrl + V
      if (e.ctrlKey && key === "V") {
        const target = e.target;
        if (target.tagName !== "BODY") {
          // can only paste if focus on body
          return;
        }

        // paste video url
        const clipText = await navigator.clipboard.readText();
        if (!isVideoUrl(clipText)) {
          return;
        }
        const addBottom = !e.shiftKey; // Shift + Ctrl + V to paste to top
        pasteVideo(clipText, addBottom);
      }
    },
    [pasteVideo],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown, true);

    return async () => {
      // remove event listeners
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onKeyDown]);

  const onShowAddVideo = useCallback(() => {
    if (!showGettingVideo) {
      setShowAddVideo(true);
      setHideControls(false);
      setAddBottom(true);
    }
  }, [setShowAddVideo, setHideControls, setAddBottom, showGettingVideo]);

  const handleClose = useCallback(() => {
    setShowAddVideo(false);
  }, [setShowAddVideo]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setShowGettingVideo(true);

    addVideoUrl({url: addUrl, controls: !hideControls, addBottom, downloadImmediately, }, () => {
      setShowGettingVideo(false);
    });
    setShowAddVideo(false);
    setAddUrl('');
    setDownloadImmediately(false);
  }, [addUrl, hideControls, addBottom, addVideoUrl, downloadImmediately]);

  const handleChange = useCallback((event) => {
    setAddUrl(event.target.value);
  }, [setAddUrl]);

  return (
    <>
      <AppBar>
        <Toolbar>
          <Typography
            variant="h6"
            noWrap
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              letterSpacing: '0rem',
              color: 'inherit',
              textDecoration: 'none',
              flexGrow: 1,
            }}
          >
            <Link to="/" className="link">
              <LiveTvIcon sx={{ mr: 1 }} /> { title ? `Night Player - ${title}` : "Night Player" }
            </Link>
          </Typography>
          <Box sx={{ flexGrow: 0 }}>
            <IconButton sx={{ mr: 2, p: 0, color: 'inherit' }} onClick={onShowAddVideo}>
              <AddLinkIcon />
            </IconButton>
            <Link to="/settings" className="link">
              <IconButton sx={{ p: 0, color: 'inherit' }}>
                <SettingsIcon />
              </IconButton>
            </Link>
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar id="back-to-top-anchor" />
      {error && (
        <Alert severity="error">
          { error }
        </Alert>
      )}
      <Outlet />
      <Dialog open={showAddVideo} onClose={handleClose}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Add Video</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Enter in YouTube URL or Twitch URL to add video to playlist.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="url"
              label="Video URL"
              type="url"
              fullWidth
              variant="standard"
              value={addUrl}
              onChange={handleChange}
            />
            <FormGroup>
              <FormControlLabel checked={hideControls} control={<Checkbox onChange={(e) => {setHideControls(e.target.checked)}} />} label="Hide Controls and Progress" />
            </FormGroup>
            <FormGroup>
              <FormControlLabel checked={addBottom} control={<Checkbox onChange={(e) => {setAddBottom(e.target.checked)}} />} label="Add to Bottom" />
            </FormGroup>
            {settings?.ytdlp?.host &&
            <FormGroup>
              <FormControlLabel checked={downloadImmediately} control={<Checkbox onChange={(e) => {setDownloadImmediately(e.target.checked)}} />} label="Download Immediately" />
            </FormGroup>}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Video</Button>
          </DialogActions>
        </form>
      </Dialog>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={showGettingVideo}
        message="Fetching video information..."
        key="snackbar-fetching-video"
      />
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={snack?.open}
        message={snack?.message}
        key="snackbar-layout"
        action={snack?.action}
      />
      <ScrollTop {...props}>
        <Fab size="small" aria-label="scroll back to top">
          <KeyboardArrowUpIcon />
        </Fab>
      </ScrollTop>
    </>
  );
});

export default Layout;