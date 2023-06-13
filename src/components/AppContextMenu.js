/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-03-21
 * See README.md
 */

import React, { useCallback, useContext, } from 'react';

import { Menu, MenuItem, ListItemIcon, ListItemText, } from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';

import VideosContext from '../contexts/VideosContext';
import LayoutContext from '../contexts/LayoutContext';

import { isVideoUrl } from '../models/Video';

export default function AppContextMenu({ contextMenu, onClose }) {
  const { addVideoUrl, } = useContext(VideosContext);
  const { setSnack } = useContext(LayoutContext);

  const onPaste = useCallback(async () => {
    const clipText = await navigator.clipboard.readText();
    if (!isVideoUrl(clipText)) {
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
  }, [onClose, setSnack, addVideoUrl,]);

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
      </Menu>
    </>
  )
};