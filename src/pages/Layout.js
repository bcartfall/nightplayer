/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useCallback, useContext, useState, } from 'react';
import { Outlet, Link } from "react-router-dom";

import { AppBar, Toolbar, Typography, useScrollTrigger, Box, Fab, Fade, IconButton, DialogActions, Button, DialogTitle, DialogContent, DialogContentText, TextField, Dialog, Snackbar, Alert, FormControlLabel, FormGroup, Checkbox, Collapse, } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import SettingsIcon from '@mui/icons-material/Settings';
import AddLinkIcon from '@mui/icons-material/AddLink';
import CloseIcon from '@mui/icons-material/Close';

import LayoutContext from '../contexts/LayoutContext';
import VideosContext from '../contexts/VideosContext';

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

export default function Layout(props) {
  const { title, error, setError, snack, addDialog, setAddDialog, folderDialog, setFolderDialog, } = useContext(LayoutContext);
  const { addVideoUrl, addFolder, } = useContext(VideosContext);
  const [showGettingVideo, setShowGettingVideo] = useState(false);

  const onShowAddVideo = useCallback(() => {
    if (!showGettingVideo) {
      setAddDialog({...addDialog, open: true, controls: {url: '', hideControls: false}});
    }
  }, [showGettingVideo, setAddDialog, addDialog, ]);

  const handleClose = useCallback((e, dialog, setDialog) => {
    setDialog({...dialog, open: false});
  }, []);

  const handleSubmit = useCallback(async (e, dialog, setDialog) => {
    e.preventDefault();

    console.log(e, dialog, setDialog);
    if (dialog.id === 'add') {
      if (dialog.controls.url.trim() === '') {
        return;
      }
      setShowGettingVideo(true);

      addVideoUrl({url: dialog.controls.url, controls: !dialog.controls.hideControls}, () => {
        setShowGettingVideo(false);
      });
      setDialog({...dialog, open: false});
    } else if (dialog.id === 'folder') {
      try {
        addFolder({parentId: '', name: dialog.controls.name});
        setFolderDialog({...folderDialog, open: false});
      } catch (e) {
        console.error(e);
        setError({open: true, message: e.toString()});
      }
    } else {
      console.error('Unhandled dialog.');
    }
  }, [setShowGettingVideo, addVideoUrl, setError, addFolder, folderDialog, setFolderDialog, ]);

  const handleChange = useCallback((e, dialog, setDialog, key, value) => {
    let controls = {...dialog.controls};
    controls[key] = value;
    setDialog({...dialog, controls, });
  }, []);

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
      <Collapse in={error.open}>
        <Alert severity="error" action={<IconButton color="inherit" size="small" onClick={() => { setError({...error, open: false}); }}><CloseIcon fontSize="inherit" /></IconButton>} sx={{mt: 2}}>
          { error.message }
        </Alert>
      </Collapse>
      <Outlet />
      <Dialog open={addDialog.open} onClose={(e) => handleClose(e, addDialog, setAddDialog)}>
        <form onSubmit={(e) => handleSubmit(e, addDialog, setAddDialog)}>
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
              onChange={(e) => handleChange(e, addDialog, setAddDialog, 'url', e.target.value)}
            />
            <FormGroup>
              <FormControlLabel control={<Checkbox onChange={(e) => handleChange(e, addDialog, setAddDialog, 'hideControls', e.target.checked)} />} label="Hide Controls and Progress" />
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={(e) => handleClose(e, addDialog, setAddDialog)}>Cancel</Button>
            <Button onClick={(e) => handleSubmit(e, addDialog, setAddDialog)}>Add Video</Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={folderDialog.open} onClose={(e) => handleClose(e, folderDialog, setFolderDialog)}>
        <form onSubmit={(e) => handleSubmit(e, folderDialog, setFolderDialog)}>
          <DialogTitle>{folderDialog.action === 'create' ? 'New' : 'Rename'} Folder</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="folder-name"
              label="Name"
              type="text"
              fullWidth
              variant="standard"
              onChange={(e) => handleChange(e, folderDialog, setFolderDialog, 'name', e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={(e) => handleClose(e, folderDialog, setFolderDialog)}>Cancel</Button>
            <Button onClick={(e) => handleSubmit(e, folderDialog, setFolderDialog)}>{folderDialog.action === 'create' ? 'Create' : 'Rename'} Folder</Button>
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
};
