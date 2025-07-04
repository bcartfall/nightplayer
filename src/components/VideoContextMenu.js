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
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import VideosContext from '../contexts/VideosContext';
import LayoutContext from '../contexts/LayoutContext';
import PlayerContext from '../contexts/PlayerContext';

export default function VideoContextMenu({ video, contextMenu, onClose, currentVideo, setCurrentVideo, }) {
  const { removeVideo, restoreVideo, saveVideo, changeVideoOrder, videos, settings, downloadVideo, } = useContext(VideosContext);
  const { setSnack } = useContext(LayoutContext);
  const playerContext = useContext(PlayerContext);

  const onToggleControls = useCallback(() => {
    onClose();
    video.controls = !video.controls;
    saveVideo(video, () => {
      if (playerContext.video?.uuid === video.uuid) {
        // player needs to refresh because reactplayer will not change controls if already loaded
        window.location.reload(false);
      }
    });
  }, [video, saveVideo, onClose, playerContext,]);

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

  const onMove = useCallback((target) => {
    const fromIndex = video.order, 
      toIndex = target === 0 ? 0 : videos.length - 1;
    console.log('Changing order from ' + fromIndex + ' to ' + toIndex);
    changeVideoOrder(video, fromIndex, toIndex);
    onClose();
  }, [video, onClose, videos, changeVideoOrder,]);

  const onDownload = useCallback(() => {
    downloadVideo(video);
    onClose();
  }, [video, downloadVideo, onClose,]);

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
        <Divider />
        <MenuItem onClick={() => {onMove(0)}}>
          <ListItemIcon>
            <VerticalAlignTopIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Move to Top</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {onMove(1)}}>
          <ListItemIcon>
            <VerticalAlignBottomIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Move to Bottom</ListItemText>
        </MenuItem>
        {settings.ytdlp.host && (video.ytdlpComplete === -1) && (
          <div>
            <Divider />
            <MenuItem onClick={onDownload}>
              <ListItemIcon>
                <FileDownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Download</ListItemText>
            </MenuItem>
          </div>
        )}
      </Menu>
    </>
  )
};