/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-03-21
 * See README.md
 */

import React, { useCallback, useContext, } from 'react';

import { Menu, MenuItem, ListItemIcon, ListItemText, Divider, Button, } from '@mui/material';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import LinkIcon from '@mui/icons-material/Link';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import RestoreIcon from '@mui/icons-material/Restore';

import VideosContext from '../contexts/VideosContext';
import LayoutContext from '../contexts/LayoutContext';

export default function VideoContextMenu({ video, contextMenu, onClose, }) {
  const { removeVideo, restoreVideo, saveVideo, } = useContext(VideosContext);
  const { setSnack } = useContext(LayoutContext);

  const onToggleControls = useCallback(() => {
    onClose();
    video.controls = !video.controls;
    saveVideo(video);
  }, [video, saveVideo, onClose]);

  const onCopyAtTime = useCallback(() => {
    let url = video.getUrlAtTime();
    navigator.clipboard.writeText(url);

    let snack = {
      open: true,
      message: 'Video URL copied to clipboard.',
    };
    setSnack(snack);
    onClose();

    setTimeout(() => {
      setSnack({...snack, open: false});
    }, 1000);
  }, [video, onClose, setSnack,]);

  const onCopy = useCallback(() => {
    let url = video.url;
    navigator.clipboard.writeText(url);

    let snack = {
      open: true,
      message: 'Video URL copied to clipboard.',
    };
    setSnack(snack);
    onClose();

    setTimeout(() => {
      setSnack({...snack, open: false});
    }, 1000);
  }, [video, onClose, setSnack,]);

  const onRemove = useCallback(() => {
    const undoVideo = video;
    let snack = {
      open: true,
      message: 'Video has been removed.',
      action: (
        <Button variant="outlined" color="warning" size="small" onClick={() => {
          // restore back video
          restoreVideo(undoVideo);
        }}>
          <RestoreIcon fontSize="small" sx={{ mr: 0.5 }} /> Undo
        </Button>
      )
    };
    setSnack(snack);
    onClose();

    removeVideo(video);

    setTimeout(() => {
      setSnack({...snack, open: false});
    }, 3000);
  }, [video, onClose, setSnack, removeVideo, restoreVideo, ]);

  return (
    <>
      <Menu open={contextMenu !== null} onClose={onClose} anchorReference="anchorPosition" anchorPosition={contextMenu !== null ? {top: contextMenu.mouseY, left: contextMenu.mouseX} : undefined}>
        <MenuItem onClick={onRemove}>
          <ListItemIcon>
            <PlaylistRemoveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove Video from Playlist</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={onToggleControls}>
          <ListItemIcon>
            <MenuOpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{ video.controls ? 'Hide' : 'Show' } Controls and Progress</ListItemText>
        </MenuItem>
        <MenuItem onClick={onCopyAtTime}>
          <ListItemIcon>
            <LinkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy Video URL at Current Time</ListItemText>
        </MenuItem>
        <MenuItem onClick={onCopy}>
          <ListItemIcon>
            <LinkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy Video URL</ListItemText>
        </MenuItem>
      </Menu>
      
    </>
  )
};