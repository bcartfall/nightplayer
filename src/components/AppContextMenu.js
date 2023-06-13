/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-03-21
 * See README.md
 */

import React, { useCallback, useContext, } from 'react';

import { Menu, MenuItem, ListItemIcon, ListItemText, Divider, } from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';

import VideosContext from '../contexts/VideosContext';
import LayoutContext from '../contexts/LayoutContext';

const isVideoUrl = (url) => {
  return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('twitch.tv');
};

export default function AppContextMenu({ contextMenu, onClose }) {
  const { addVideoUrl, } = useContext(VideosContext);
  const { setSnack, setError, folderDialog, setFolderDialog, } = useContext(LayoutContext);

  const onPaste = useCallback(async () => {
    const clipText = await navigator.clipboard.readText();
    if (!isVideoUrl(clipText)) {
      setError({open: true, message: 'Not a valid video URL.'});
      onClose();
      return;
    }

    addVideoUrl({url: clipText});

    let snack = {
      open: true,
      message: 'Video added.',
    };
    setSnack(snack);
    onClose();

    setTimeout(() => {
      setSnack({...snack, open: false});
    }, 1000);
  }, [onClose, setSnack, addVideoUrl, setError, ]);

  const onNewFolder = useCallback(() => {
    setFolderDialog({...folderDialog, open: true, controls: {name: ''}});
    onClose();
  }, [onClose, folderDialog, setFolderDialog, ]);

  // check

  return (
    <>
      <Menu open={contextMenu !== null} onClose={onClose} anchorReference="anchorPosition" anchorPosition={contextMenu !== null ? {top: contextMenu.mouseY, left: contextMenu.mouseX} : undefined}>
        <MenuItem onClick={onPaste}>
          <ListItemIcon>
            <ContentPasteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Paste Video URL</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={onNewFolder}>
          <ListItemIcon>
            <CreateNewFolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>New Folder</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
};