/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import { Dialog, DialogContent, DialogTitle, DialogContentText, } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import './App.css';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import React, { useEffect, useState, useCallback, useRef, } from 'react';
import { HashRouter, Routes, Route } from "react-router-dom";

import Layout from './pages/Layout';
import Main from './pages/Main';
import Settings from './pages/Settings';
import Player from './pages/Player';
import LayoutContext from './contexts/LayoutContext';
import VideosContext from './contexts/VideosContext';
import Database from './models/Database';
import TwitchAPI from './models/TwitchAPI';
import Video from './models/Video';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export default function App(props) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [videos, setVideos] = useState([]);
  const [settings, setSettings] = useState(null);
  const shouldLoadVideos = useRef(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);
  const [dialog, setDialog] = useState({open: false});
  const dragRef = useRef(0);

  const saveSettings = useCallback(async (nSettings) => {
    console.log('saveSettings', nSettings);
    // if database driver changes, reload videos
    if (nSettings.databaseDriver !== settings.databaseDriver || JSON.stringify(nSettings.firebase) !== JSON.stringify(settings.firebase)) {
      shouldLoadVideos.current = true;
      await Database.setDriver(nSettings.databaseDriver, nSettings);
    }

    if (shouldLoadVideos.current) {
      // keep trying to load videos until we don't get an error any more
      try {
        await loadVideos();
        setError(null);
        shouldLoadVideos.current = false;
      } catch (e) {
        console.error(e);
        setError(e.toString());
      }
    }
    localStorage.setItem('settings', JSON.stringify(nSettings));
    TwitchAPI.setClient(nSettings.twitch);
    setSettings(nSettings);
  }, [settings, setSettings, setError]);

  const addVideoUrl = useCallback(async ({url, controls}, callback) => {
    // add video by url
    const video = new Video({url, controls,});

    // set order to the last video + 1
    if (videos.length > 0) {
      video.order = videos[videos.length - 1].order + 1;
    } else {
      video.order = 0; // first video added
    }

    // get video information
    await video.loadRemoteData(settings);

    const nVideos = [...videos, video];
    setVideos(nVideos);

    // save video to DB
    console.log('Storing video', video);
    await Database.set('videos', video.uuid, video.toObject());
    console.log('Done storing.');

    if (callback) {
      callback();
    }
  }, [videos, setVideos, settings]);

  const loadVideos = async () => {
    try {
      const result = await Database.get('videos', '*');
      let cVideos = [];
      for (const obj of result) {
        cVideos.push(new Video(obj));
      }
  
      console.log('Loading videos from DB.', cVideos);
      setVideos(cVideos);

    } catch (e) {
      console.error(e);
      setError(e.toString());
    }
  };

  const saveVideo = useCallback(async (video) => {
    console.log('Saving video', video);
    await Database.set('videos', video.uuid, video.toObject());
  }, []);

  useEffect(() => {
    // loading data
    const fetchDB = async () => {
      let localSettings = JSON.parse(localStorage.getItem('settings'));
      if (!localSettings) {
        localSettings = {
          youtube: {
            apiKey: null,
          },
          twitch: {
            apiClientId: null,
            apiSecret: null,
          },
          databaseDriver: 'indexeddb',
          firebase: {
            apiKey: null,
            authDomain: null,
            projectId: null,
            storageBucket: null,
            messagingSenderId: null,
            appId: null,
          },
        };
      }
      setSettings(localSettings);
      await Database.setDriver(localSettings.databaseDriver ?? 'local', localSettings);
      TwitchAPI.setClient(localSettings.twitch);

      // deserliaze list of videos
      await loadVideos();
      
      setLoading(false);
    };
    fetchDB();
  }, [setVideos, setLoading, setSettings, ]);

  const changeVideoOrder = useCallback((changeVideo, fromIndex, toIndex) => {
    let nVideos = [...videos];

    if (toIndex === fromIndex) {
      return; // no change
    }
    console.log(fromIndex, toIndex);
    nVideos[toIndex] = changeVideo;

    // fill in positions
    if (toIndex > fromIndex) {
      for (let i = fromIndex; i < toIndex; i++) {
        const video = videos[i + 1];
        nVideos[i] = video;
      }
    } else {
      for (let i = fromIndex; i > toIndex; i--) {
        const video = videos[i - 1];
        nVideos[i] = video;
      }
    }

    // save
    for (let order in nVideos) {
      const video = nVideos[order];
      if (video.order !== order) {
        video.order = order;
        saveVideo(video);
      }
    }
    
    setVideos(nVideos);
  }, [videos, setVideos, saveVideo]);

  const removeVideo = useCallback(async (video) => {
    console.log('Removing video', video);

    let nVideos = videos.filter((item) => {
      return item.uuid !== video.uuid;
    });
    console.log(nVideos);
    setVideos(nVideos);
    await Database.delete('videos', video.uuid);
  }, [videos, setVideos]);

  const restoreVideo = useCallback(async (video) => {
    console.log('Restoring video', video);
    // add video and sort by order
    saveVideo(video); // save to DB

    // the state of the VideoContextMenu that was removed appears to have the video before it was removed
    // so if we call setVideos with this it seems to restore the removed video
    setVideos(videos); 
  }, [videos, setVideos, saveVideo,]);

  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    dragRef.current++;
    //console.log('onDragEnter', e);

    if (e.dataTransfer.types.includes('text/uri-list')) {
      setDialog({
        open: true,
        title: 'Add Video',
        message: 'Drop YouTube URL or Twitch URL to add video.',
      });
    }
  }, [dragRef, setDialog]);

  const onDragLeave = useCallback((e) => {
    //console.log('onDragLeave', e);
    dragRef.current--;
    if (dragRef.current === 0) {
      setDialog({...dialog, open: false});
    }
  }, [dialog, setDialog, dragRef]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    console.log('onDrop', e);

    if (e.dataTransfer.types.includes('text/uri-list')) {
      const url = e.dataTransfer.getData('Url').trim();
      if (url !== '') {
        addVideoUrl({url,});
      }
    }

    dragRef.current = 0;
    setDialog({...dialog, open: false})
  }, [dialog, setDialog, dragRef, addVideoUrl,]);

  return (
    <ThemeProvider theme={darkTheme}>
      <LayoutContext.Provider value={{ title, setTitle, error, snack, setSnack, }}>
        <VideosContext.Provider value={{ videos, addVideoUrl, saveVideo, changeVideoOrder, removeVideo, restoreVideo, }}>
          <CssBaseline />
          <div className="app" onDrop={onDrop} onDragEnter={onDragEnter} onDragOver={(e) => e.preventDefault()} onDragLeave={onDragLeave}>
            <HashRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Main loading={loading} />} />
                  <Route path="player/:uuid" element={<Player />} />
                  <Route path="settings" element={<Settings settings={settings} saveSettings={saveSettings} />} />
                  <Route path="*" element={<Main loading={loading} />} />
                </Route>
              </Routes>
            </HashRouter>
            <Dialog open={dialog?.open}>
              <DialogTitle>{dialog?.title}</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  {dialog?.message}
                </DialogContentText>
              </DialogContent>
            </Dialog>
          </div>
        </VideosContext.Provider>
      </LayoutContext.Provider>
    </ThemeProvider>
  );
}