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
import { HashRouter, Routes, Route, } from "react-router-dom";

import Layout from './pages/Layout';
import Main from './pages/Main';
import Settings from './pages/Settings';
import Player from './pages/Player';
import LayoutContext from './contexts/LayoutContext';
import VideosContext from './contexts/VideosContext';
import { setDatabase, getDatabase, } from './database/Database';
import TwitchAPI from './models/TwitchAPI';
import Video from './models/Video';
import AppContextMenu from './components/AppContextMenu';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    none: {
      main: '#444444',
    },
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
  const lastActionRef = useRef(0);
  const autoplayRef = useRef(false);
  const [contextMenu, setContextMenu] = useState(null);

  const loadVideos = useCallback(async () => {
    try {
      const result = await getDatabase().get('videos', '*');
      console.log('loadVideos', result);
      let cVideos = [];
      for (const i in result) {
        const aVideo = new Video(result[i]);
        cVideos.push(aVideo);
      }

      // save number of videos so we can show placeholder
      localStorage.setItem('number_of_videos', cVideos.length);
  
      let diff = false;
      if (videos && cVideos && cVideos.length !== videos.length) {
        diff = true;
      } else {
        for (let i in cVideos) {
          if (!cVideos[i].equals(videos[i])) {
            diff = true;
            break;
          }
        }
      }

      if (diff) {
        return cVideos;
      }
    } catch (e) {
      console.error(e);
      setError(e.toString());
    }

    return null;
  }, [videos, setError,]);

  const saveSettings = useCallback(async (nSettings) => {
    setSettings(nSettings);

    // if database driver changes, reload videos
    if (nSettings.databaseDriver !== settings.databaseDriver || JSON.stringify(nSettings.firebase) !== JSON.stringify(settings.firebase)) {
      shouldLoadVideos.current = true;
      try {
        console.log('changing database driver.');
        await setDatabase(nSettings.databaseDriver, nSettings);
      } catch (e) {
        setError(e.toString());
      }
    }

    if (shouldLoadVideos.current) {
      // keep trying to load videos until we don't get an error any more
      try {
        const nVideos = await loadVideos();
        if (nVideos) {
          setVideos(nVideos);
        }
        setError(null);
        shouldLoadVideos.current = false;
      } catch (e) {
        console.error(e);
        setError(e.toString());
      }
    }
    localStorage.setItem('settings', JSON.stringify(nSettings));
    TwitchAPI.setClient(nSettings.twitch);
  }, [settings, setSettings, setError, loadVideos, setVideos,]);

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
    try {
      await video.loadRemoteData(settings);
    } catch (e) {
      console.error(e);
      setError(e.toString());
      if (callback) {
        callback(null);
      }
      return false;
    }

    const nVideos = [...videos, video];
    setVideos(nVideos);

    // save video to DB
    console.log('Storing video', video);
    await video.save();
    console.log('Done storing.');

    if (callback) {
      callback(video);
    }

    // save number of videos so we can show placeholder
    localStorage.setItem('number_of_videos', nVideos.length);

    // add to log
    await video.log('create', {url,});
  }, [videos, setVideos, settings]);

  const saveVideo = useCallback(async (video, callback = null, force = false) => {
    await video.save(force);

    if (callback) {
      callback(video);
    }
  }, []);

  useEffect(() => {
    console.log('mounting app');
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

      try {
        await setDatabase(localSettings.databaseDriver ?? 'local', localSettings);
      } catch (e) {
        setError(e.toString());
      }
      TwitchAPI.setClient(localSettings.twitch);

      // load list of videos
      const nVideos = await loadVideos();
      if (nVideos) {
        setVideos(nVideos);
      }
      setLoading(false);
    };
    fetchDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeVideoOrder = useCallback((changeVideo, fromIndex, toIndex) => {
    let nVideos = [...videos];

    if (toIndex === fromIndex) {
      return; // no change
    }
    //console.log(fromIndex, toIndex);
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
      order = parseInt(order, 10);
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
    await getDatabase().delete('logs', '*', {where: [['video_id', '=', video.uuid]]});
    await getDatabase().delete('videos', video.uuid);

    // save number of videos so we can show placeholder
    localStorage.setItem('number_of_videos', nVideos.length);
  }, [videos, setVideos]);

  const restoreVideo = useCallback(async (video) => {
    console.log('Restoring video', video);
    // add video and sort by order
    saveVideo(video, null, true); // save to DB

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

  const updateLastAction = useCallback(async() => {
    const now = Date.now();
    if (lastActionRef.current > 0) {
      const elapsed = now - lastActionRef.current;
      lastActionRef.current = now;
      if (elapsed > 600000) { // 10 minutes
        autoplayRef.current = false;
        console.log('App has been inactive for more than 10 minutes. Reloading video data.');
        const nVideos = await loadVideos();
        if (nVideos) {
          setVideos(nVideos);
        }
      }
    } else {
      lastActionRef.current = now;
    }
  }, [lastActionRef, autoplayRef, loadVideos, setVideos,]);


  const onMouseMove = useCallback(() => {
    updateLastAction();
  }, [updateLastAction,]);

  const onKeyUp = useCallback(() => {
    updateLastAction();
  }, [updateLastAction,]);

  const onClick = useCallback(() => {
    updateLastAction();
  }, [updateLastAction,]);

  const handleContextMenu = (event) => {
    if (event.target.id !== 'main-grid' && event.target.id !== 'app') {
      // show context menu on main grid and app background only
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
          }
        : // repeated contextmenu when it is already open closes it with Chrome 84 on Ubuntu
          // Other native context menus might behave different.
          // With this behavior we prevent contextmenu from the backdrop to re-locale existing context menus.
          null,
    );
  };

  const handleContextClose = () => {
    setContextMenu(null);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <LayoutContext.Provider value={{ title, setTitle, error, snack, setSnack, }}>
        <VideosContext.Provider value={{ videos, addVideoUrl, saveVideo, changeVideoOrder, removeVideo, restoreVideo, loading, updateLastAction, autoplayRef, }}>
          <CssBaseline />
          <div className="app" id="app" onDrop={onDrop} onDragEnter={onDragEnter} onDragOver={(e) => e.preventDefault()} onDragLeave={onDragLeave} onMouseMove={onMouseMove} onKeyUp={onKeyUp} onClick={onClick} onContextMenu={handleContextMenu}>
            <HashRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Main />} />
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
            <AppContextMenu contextMenu={contextMenu} onClose={handleContextClose} />
          </div>
        </VideosContext.Provider>
      </LayoutContext.Provider>
    </ThemeProvider>
  );
}