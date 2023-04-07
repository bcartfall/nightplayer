/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import React, { useCallback, useContext, useEffect } from 'react';
import { Typography, CircularProgress, Grow, Grid, FormControl, InputLabel, Select, MenuItem, TextField, FormGroup, } from '@mui/material';

import LayoutContext from '../contexts/LayoutContext';

export default function Settings({ settings, saveSettings, }) {
  const { setTitle } = useContext(LayoutContext);

  useEffect(() => {
    // change title
    setTitle("Settings");
  }, [ setTitle, ]);

  const onChange = useCallback((key, value) => {
    let nSettings = {
      ...settings,
    }

    const a = key.split('.');
    if (a.length > 1) {
      nSettings[a[0]][a[1]] = value;
    } else {
      nSettings[key] = value;
    }
    saveSettings(nSettings);
  }, [saveSettings, settings]);

  const onFirebaseConfig = useCallback((e) => {
    try {
      const config = e.target.value, l = config.length;
      e.target.value = '';

      let nSettings = {
        ...settings,
      };

      // find 'firebaseConfig = {'
      const variables = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId',
      ];

      const getValue = (name) => {
        const match = `${name}: "`;
        const p = config.indexOf(match);
        if (p < 0) {
          return null;
        }

        let buffer = '';
        let i = p + match.length;
        while (true) {
          if (i >= l) {
            return null;
          }

          const chr = config[i];
          if (chr === '"') {
            return buffer;
          }

          buffer += chr;
          i++;
        }
      };

      for (const variable of variables) {
        const value = getValue(variable);
        if (value) {
          nSettings.firebase[variable] = value;
        }
      }

      saveSettings(nSettings);
    } catch (e) {
      console.error(e);
    }
    
  }, [saveSettings, settings]);

  if (!settings) {
    return (
      <>
        <CircularProgress />
        <Typography sx={{mt: 2}}>Loading...</Typography>
      </>
    );
  }

  return (
    <Grow in={true}>
      <div className="page">
        <FormGroup>
          <Typography variant="h4" sx={{mb: 1}}>
            API Settings
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required label="YouTube API Key" type="password" value={settings.youtube.apiKey || ''} onFocus={e => {e.target.select()}} onChange={(e) => {onChange('youtube.apiKey', e.target.value)}} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Twitch API Client ID" value={settings.twitch.apiClientId || ''} onFocus={e => {e.target.select()}} onChange={(e) => {onChange('twitch.apiClientId', e.target.value)}} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Twitch API Secret" type="password" value={settings.twitch.apiSecret || ''} onFocus={e => {e.target.select()}} onChange={(e) => {onChange('twitch.apiSecret', e.target.value)}} />
            </Grid>
          </Grid>
        </FormGroup>
        <FormGroup sx={{mt: 5}}>
          <Typography variant="h4" sx={{mb: 1}}>
            Application Settings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Database Driver*</InputLabel>
                <Select fullWidth required label="Select Database Driver*" value={settings.databaseDriver || ''} onChange={(e) => {onChange('databaseDriver', e.target.value)}}>
                  <MenuItem value="indexeddb">IndexedDB (local)</MenuItem>
                  <MenuItem value="firebase">Firebase</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </FormGroup>
        {settings.databaseDriver === 'firebase' && (
          <FormGroup sx={{mt: 5}}>
            <Typography variant="h4" sx={{mb: 1}}>
              Firebase Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography sx={{mb: 2}}>Paste the Firebase config variable from the Firebase app setup page.</Typography>
                <TextField label="Firebase Configuration JSON." multiline rows={6} fullWidth onChange={onFirebaseConfig} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth required label="Firebase API Key" type="password" value={settings.firebase.apiKey || ''} onFocus={e => {e.target.select()}} onChange={(e) => {onChange('firebase.apiKey', e.target.value)}} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth required label="Firebase Auth Domain" type="text" value={settings.firebase.authDomain || ''} onFocus={e => {e.target.select()}} onChange={(e) => {onChange('firebase.authDomain', e.target.value)}} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth required label="Firebase Project Id" type="text" value={settings.firebase.projectId || ''} onFocus={e => {e.target.select()}} onChange={(e) => {onChange('firebase.projectId', e.target.value)}} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth required label="Firebase Storage Bucket" type="text" value={settings.firebase.storageBucket || ''} onFocus={e => {e.target.select()}} onChange={(e) => {onChange('firebase.storageBucket', e.target.value)}} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth required label="Firebase Messaging Sender Id" type="text" value={settings.firebase.messagingSenderId || ''} onFocus={e => {e.target.select()}} onChange={(e) => {onChange('firebase.messagingSenderId', e.target.value)}} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth required label="Firebase App Id" type="text" value={settings.firebase.appId || ''} onFocus={e => {e.target.select()}} onChange={(e) => {onChange('firebase.appId', e.target.value)}} />
              </Grid>
            </Grid>
          </FormGroup>
        )}
      </div>
    </Grow>
  );
}