/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-03-21
 * See README.md
 */

import React, { useCallback, useContext, } from 'react';

import { Menu, MenuItem, ListItemIcon, ListItemText, Divider, } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MoreTimeIcon from '@mui/icons-material/MoreTime';

import VideosContext from '../contexts/VideosContext';
import LayoutContext from '../contexts/LayoutContext';
import PlayerContext from '../contexts/PlayerContext';

export default function PlayerContextMenu({ contextMenu, onClose }) {
  const { saveVideo, } = useContext(VideosContext);
  const { setSnack } = useContext(LayoutContext);
  const { video, playing, setPlaying, showJumpToTime, } = useContext(PlayerContext);

  const onToggleControls = useCallback(() => {
    onClose();
    video.controls = !video.controls;
    saveVideo(video, () => {
      if (video?.uuid === video.uuid) {
        // player needs to refresh because reactplayer will not change controls if already loaded
        window.location.reload(false);
      }
    });
  }, [saveVideo, onClose, video,]);

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

  const onTogglePlay = useCallback(() => {
    setPlaying(!playing);
    onClose();
  }, [playing, setPlaying, onClose,]);

  const onJumpToTime = useCallback(() => {
    showJumpToTime();
    onClose();
  }, [onClose, showJumpToTime,]);

  return (
    <>
      <Menu open={contextMenu !== null} onClose={onClose} anchorReference="anchorPosition" anchorPosition={contextMenu !== null ? {top: contextMenu.mouseY, left: contextMenu.mouseX} : undefined}>
        <MenuItem onClick={onTogglePlay}>
          <ListItemIcon>
            <MenuOpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{ !playing ? 'Play' : 'Pause' }</ListItemText>
        </MenuItem>
        <MenuItem onClick={onJumpToTime}>
          <ListItemIcon>
            <MoreTimeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Jump to Time</ListItemText>
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