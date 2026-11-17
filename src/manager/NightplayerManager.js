/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2026-11-17
 * See README.md
 */

import IManager from "./IManager";

let BASE = null;

async function api(method, path, { json, headers = {}, label, raw = false } = {}) {
    const response = await fetch(BASE + path, {
        method,
        headers: { ...(json ? { 'content-type': 'application/json' } : {}), ...headers },
        body: json ? JSON.stringify(json) : undefined,
    });
    if (raw) return { response, };
    const text = await response.text();
    let body = text;
    try { body = text ? JSON.parse(text) : null; } catch { /* leave as text */ }
    return { response, body };
}

class NightplayerManager extends IManager {
    async init(settings) {
        this._settings = settings;
        BASE = settings.manager.host;
    }

    assertReady() {
        if (!this._settings.manager.host) {
            throw new Error('Manager host setting not configured.');
        }
    }

    async download(video) {
        this.assertReady();

        if (video.ytdlpComplete !== -1) {
            throw new Error('Video is already downloading.');
        }

        video.ytdlpProgress = -1;
        video.ytdlpSpeed = 0;

        // send POST to API to start download
        const url = video.url;
        console.log(`Downloading ${url}`)
        const { response, body } = await api('POST', '/api/download', { json: { url, } });
        if (!response.ok) {
            console.error(response);
            throw new Error(`${response.status} API error`);
        }

        const managerVideo = body;
        const uuid = managerVideo.uuid;
      
        console.log(`Download started uuid=${uuid}`);
        console.log(managerVideo);

        // update and save
        video.ytdlpUuid = uuid;
        video.ytdlpComplete = 0;
        await video.save();

        // start update progress by listening to stream
        video.updateDownloadProgress(this._settings, managerVideo);
    }

    async info(video) {
        this.assertReady();

        const uuid = video.ytdlpUuid;
        console.log(`Getting video information ${uuid}`);

        const { response, body } = await api('GET', `/api/videos/${uuid}`);
        if (!response.ok) {
            console.error(response);
            throw new Error(`${response.status} API error`);
        }
        const managerVideo = body;
        if (!managerVideo) {
            throw new Error('API response empty.');
        }

        return managerVideo;
    }

    async eventStream(managerVideo, onEvent) {
        this.assertReady();
        if (!managerVideo.links.events) {
            console.log('No event stream found.');
            return; // no event stream found
        }

        const { response } = await api('GET', managerVideo.links.events, { raw: true, headers: { accept: 'text/event-stream' } });

        const reader = response.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (; ;) {
            const { value, done } = await reader.read();
            if (done) return;
            buf += dec.decode(value, { stream: true });
            let i;
            while ((i = buf.indexOf('\n\n')) !== -1) {
                const block = buf.slice(0, i);
                buf = buf.slice(i + 2);
                const ev = /^event: (.+)$/m.exec(block)?.[1];
                const data = /^data: (.+)$/m.exec(block)?.[1];
                if (ev && data && onEvent(ev, JSON.parse(data)) === false) { await reader.cancel(); return; }
            }
        }
    }

    async delete(video) {
        this.assertReady();

        const uuid = video.ytdlpUuid;
        console.log(`Deleting video uuid=${uuid}`);

        const { response, body } = await api('DELETE', `/api/videos/${uuid}`);
        if (response.ok && body?.deleted === true) {
            console.log('Deleted.');
        } else {
            throw new Error('Error deleting video');
        }
    }
    
};

export default NightplayerManager;