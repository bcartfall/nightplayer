/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-03-21
 * See README.md
 */

import React, { useCallback, } from 'react';

import { Menu, MenuItem, ListItemIcon, ListItemText, } from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';

import { isVideoUrl } from '../models/Video';

export default function AppContextMenu({ contextMenu, onClose, onPasteUrl }) {
  const onPaste = useCallback(async () => {
    const clipText = await navigator.clipboard.readText();
    if (!isVideoUrl(clipText)) {
      return;
    }

    onClose();

    onPasteUrl(clipText);
  }, [onClose, onPasteUrl,]);

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