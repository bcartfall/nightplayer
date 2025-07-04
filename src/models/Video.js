/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import { getDatabase } from '../database/Database';
import TwitchAPI from '../models/TwitchAPI';
import { v4 as uuidv4 } from 'uuid';

export function isVideoUrl(url) {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('twitch.tv');
};

function parseStringTime(s) {
    var match = s.match(/(\d+h)?(\d+m)?(\d+s)?/);
    match = match.slice(1).map(function(x) {
        if (x != null) {
            return x.replace(/\D/, '');
        }
        return x;
    });

    var hours = (parseInt(match[0]) || 0);
    var minutes = (parseInt(match[1]) || 0);
    var seconds = (parseInt(match[2]) || 0);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (hours === 0 && minutes === 0 && seconds === 0) {
        // might be just ?t=5000, in such a case return the number
        return parseInt(s, 10);
    }
    return totalSeconds;
}

function youtube_parser(url){
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return (match&&match[7].length===11)? match[7] : false;
}

function YTDurationToSeconds(duration) {
    var match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

    match = match.slice(1).map(function(x) {
        if (x != null) {
            return x.replace(/\D/, '');
        }
        return x;
    });

    var hours = (parseInt(match[0]) || 0);
    var minutes = (parseInt(match[1]) || 0);
    var seconds = (parseInt(match[2]) || 0);

    return hours * 3600 + minutes * 60 + seconds;
}

class Video {
    constructor(props) {
        this.uuid = props.uuid ?? uuidv4();
        this.order = parseInt(props.order ?? -1, 10);
        this.url = props.url;

        // parse source
        if (this.url.includes('twitch.tv')) {
            this.source = 'twitch';
        } else {
            this.source = 'youtube';
        }

        // get t param
        const t = new URLSearchParams(new URL(this.url).search).get('t');

        this.position = props.position ?? (t ? parseStringTime(t) : 0);
        this.duration = props.duration ?? 0;
        this.thumbnailUrl = props.thumbnailUrl ?? null;
        this.title = props.title ?? null;
        this.description = props.description ?? null;
        this.controls = props.controls ?? true;
        this.ytdlpUuid = props.ytdlpUuid ?? '';
        this.ytdlpComplete = props.ytdlpComplete ?? -1; // -1 not started, 0 false, 1 = true
        this.ytdlpProgress = 0; // don't save or serialize
        this.ytdlpSpeed = 0; // don't save or serialize

        this._originalAttributes = this.toObject();
    }

    toObject() {
        return {
            uuid: this.uuid,
            order: this.order,
            url: this.url,
            source: this.source,
            position: this.position,
            duration: this.duration,
            thumbnailUrl: this.thumbnailUrl,
            title: this.title,
            description: this.description,
            controls: this.controls,
            ytdlpUuid: this.ytdlpUuid,
            ytdlpComplete: this.ytdlpComplete,
        }
    }

    async save(force = false) {
        const obj = this.toObject();
        if (force || JSON.stringify(obj) !== JSON.stringify(this._originalAttributes)) {
            console.log('Saving video', this);
            this._originalAttributes = obj;
            await getDatabase().put('videos', this.uuid, obj);
        } else {
            console.log('Not saving video because no changes', this);
        }
    }

    async log(action, data = {}) {
        const obj = {
            uuid: uuidv4(),
            video_id: this.uuid,
            action,
            data,
            created_at: new Date(),
        };
        await getDatabase().put('logs', obj.uuid, obj);
    }

    equals(video) {
        if (!video) {
            return false;
        }
        return JSON.stringify(this.toObject()) === JSON.stringify(video.toObject());
    }

    getUrlAtTime() {
        if (this.source === "twitch") {
            const p = Math.floor(this.position);
            const hours = Math.floor(p / 3600).toString(),
                minutes = Math.floor((p / 60) % 60).toString(),
                seconds = (p % 60).toString();
            return `${this.url}?t=${hours}h${minutes}m${seconds}s`;
        }
        return this.url + (this.url.includes('?') ? '&' : '?') + 't=' + Math.round(this.position);
    }

    getThumbnailUrl(width, height) {
        if (!this.thumbnailUrl) {
            return '';
        }
        return this.thumbnailUrl.replace('%{width}', width).replace('%{height}', height);
    }

    /**
     * Load data about video from youtube/twitch such as thumbnail, description, etc...
     */
    async loadRemoteData(settings) {
        if (this.source === 'youtube') {
            // youtube
            console.log('Getting youtube information.');
            if (!settings.youtube.apiKey) {
                throw new Error('Youtube Key has not been configured.');
            }

            const videoId = youtube_parser(this.url);
            if (!videoId) {
                throw new Error('Error parsing videoId from url');
            }

            const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${videoId}&key=${settings.youtube.apiKey}`;
            let response = await fetch(url);
            let json = await response.json();
            console.log('YouTube API Response', json);

            this.url = `https://www.youtube.com/watch?v=${json.items[0].id}`;
            this.title = json.items[0].snippet.title;
            this.description = json.items[0].snippet.description;
            this.thumbnailUrl = json.items[0].snippet.thumbnails.standard.url;
            this.duration = YTDurationToSeconds(json.items[0].contentDetails.duration);
        } else if (this.source === 'twitch') {
            // twitch
            console.log('Getting twitch information.');
            const a = this.url.split("/");
            const b = a[a.length - 1].split("?");
            const videoId = b[0];

            const json = await TwitchAPI.get(`https://api.twitch.tv/helix/videos`, {id: videoId});
            console.log(json);
            console.log(json.data[0]);

            this.url = json.data[0].url;
            this.title = json.data[0].title;
            this.description = json.data[0].description;
            this.thumbnailUrl = json.data[0].thumbnail_url;

            // parse twitch duration // 1h22m28s
            this.duration = parseStringTime(json.data[0].duration);
            console.log(this);
        }
    }

    async updateDownloadProgress(settings) {
        console.log('Updating download progress.');
        if (!settings || !settings.ytdlp) {
            console.log('Settings not loaded.', settings);
            return;
        }

        if (this.ytdlpUuid === '') {
            console.log('UUID not found.');
            this.ytdlpComplete = -1;
            this.ytdlpUuid = '';
            await this.save();
            return;
        }

        // set GET request
        const response = await fetch(`${settings.ytdlp.host}/api/v1/running`, {
            method: 'GET',
        });
        if (!response.ok) {
            console.error('Error sending download request.');
        }
        const responseData = await response.json();

        let item = null;
        for (let obj of responseData) {
            if (obj.id === this.ytdlpUuid) {
                item = obj;
                break;
            }
        }
        if (!item) {
            console.log('Video not found.');
            this.ytdlpComplete = -1;
            this.ytdlpUuid = '';
            await this.save();
            return;
        }

        const percentage = item.progress.percentage;
        if (percentage === '-1') {
            console.log('Video download completed.');
            this.ytdlpComplete = 1;
            this.ytdlpProgress = 1.0;
            await this.save();
        }

        this.ytdlpProgress = percentage.slice(0, -1) * 0.01;
        this.ytdlpSpeed = item.progress.speed;

        if (this.ytdlpComplete === 0) {
            // check again in 1s
            setTimeout(() => {
                this.updateDownloadProgress(settings);
            }, 1000);
        }
    }
};

export default Video;