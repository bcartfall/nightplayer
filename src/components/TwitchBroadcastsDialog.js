/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * See README.md
 */

import React, { useCallback, useEffect, useRef, useState, } from 'react';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemAvatar,
  ListItemText, Avatar, Box, Chip, CircularProgress, Alert, Typography, ListItemButton,
} from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';

import TwitchAPI from '../models/TwitchAPI';

const VIDEOS_URL = 'https://api.twitch.tv/helix/videos';
const PAGE_SIZE = 100; // Helix maximum
const MAX_PAGES = 30; // safety cap (3000 broadcasts)

const thumbnail = (url) => (url ? url.replace('%{width}', 320).replace('%{height}', 180) : '');

const pad = (n) => String(n).padStart(2, '0');

// Twitch durations look like "3h2m1s", "45m10s" or "30s" -> "03:02:01"
const formatDuration = (duration) => {
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(duration || '');
  if (!match) {
    return duration || '';
  }
  const [h, m, s] = [match[1], match[2], match[3]].map((x) => Number(x || 0));
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// ISO timestamp -> "YYYY-MM-DD HH:MM:SS" (24 hour, local time)
const formatDateTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * Lists every past broadcast (VOD) of the streamer who owns `video`, highlighting `video` itself.
 */
export default function TwitchBroadcastsDialog({ open, video, onClose, onAdd, }) {
  const [vods, setVods] = useState([]);
  const [streamer, setStreamer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrolledRef = useRef(false);

  // depend on the id, not the video object (it is replaced whenever progress is saved)
  const videoId = video.getTwitchId();

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    scrolledRef.current = false;
    setVods([]);
    setStreamer('');
    setError(null);
    setLoading(true);

    (async () => {
      try {
        if (!videoId) {
          throw new Error('Could not determine the Twitch video id from the URL.');
        }

        // find the streamer from the current video
        const current = await TwitchAPI.get(VIDEOS_URL, { id: videoId });
        const first = current?.data?.[0];
        if (!first) {
          throw new Error(current?.message ?? 'Video not found on Twitch (it may have been deleted).');
        }
        if (cancelled) return;
        setStreamer(first.user_name ?? first.user_login ?? '');

        // page through all past broadcasts for that streamer
        let cursor = null;
        for (let page = 0; page < MAX_PAGES; page++) {
          const params = { user_id: first.user_id, type: 'archive', first: PAGE_SIZE, sort: 'time' };
          if (cursor) {
            params.after = cursor;
          }
          const json = await TwitchAPI.get(VIDEOS_URL, params);
          if (cancelled) return;
          if (!json?.data) {
            throw new Error(json?.message ?? 'Failed to load broadcasts from Twitch.');
          }
          setVods((prev) => [...prev, ...json.data]);
          cursor = json.pagination?.cursor;
          if (!cursor) {
            break;
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(e.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, videoId]);

  // scroll the current video into view once, as soon as it has been rendered
  const currentRef = useCallback((node) => {
    if (node && !scrolledRef.current) {
      scrolledRef.current = true;
      node.scrollIntoView({ block: 'center' });
    }
  }, []);

  const currentFound = vods.some((v) => v.id === videoId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      // React events bubble through portals; keep right-clicks from re-opening the video's context menu
      onContextMenu={(e) => e.stopPropagation()}
    >
      <DialogTitle>
        Past Broadcasts{streamer ? ` - ${streamer}` : ''}
        {vods.length > 0 && <Chip size="small" label={vods.length} sx={{ ml: 1 }} />}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        {!loading && !error && vods.length === 0 && (
          <Typography sx={{ m: 2 }}>No past broadcasts found.</Typography>
        )}
        {!loading && !error && vods.length > 0 && !currentFound && (
          <Alert severity="info" sx={{ m: 2 }}>
            The current video is not a past broadcast (e.g. a highlight or upload), so it is not in this list.
          </Alert>
        )}
        <List disablePadding>
          {vods.map((vod) => {
            const isCurrent = vod.id === videoId;
            return (
              <ListItem
                key={vod.id}
                disablePadding
                ref={isCurrent ? currentRef : undefined}
                secondaryAction={
                  <Button size="small" variant="outlined" startIcon={<AddLinkIcon />} onClick={() => onAdd(vod.url)}>
                    Add
                  </Button>
                }
                sx={isCurrent ? { bgcolor: 'action.selected', borderLeft: 4, borderColor: 'primary.main' } : { borderLeft: 4, borderColor: 'transparent' }}
              >
                <ListItemButton
                  component="a"
                  href={vod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ p: 1.5, pr: 12 }}
                >
                  <ListItemAvatar sx={{ mr: 2 }}>
                    <Avatar variant="rounded" src={thumbnail(vod.thumbnail_url)} sx={{ width: 128, height: 72 }} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={vod.title || '(untitled)'}
                    primaryTypographyProps={{ fontWeight: isCurrent ? 700 : 400 }}
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={
                      <>
                        {formatDateTime(vod.created_at)} &middot; {formatDuration(vod.duration)}
                        {isCurrent && <Chip size="small" color="primary" label="Current" sx={{ ml: 1 }} />}
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={28} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}