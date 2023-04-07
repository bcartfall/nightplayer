/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import TwitchAPI from '../models/TwitchAPI';
import { v4 as uuidv4 } from 'uuid';

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
    if (seconds === 0) {
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
        this.order = props.order ?? -1;
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
        }
    }

    getUrlAtTime() {
        if (this.source === "twitch") {
            const p = Math.floor(this.position);
            const hours = Math.floor(p / 3600).toString(),
                minutes = Math.floor((p / 60) % 60).toString(),
                seconds = (p % 60).toString();
            return `${this.url}?t=${hours}h${minutes}m${seconds}s`;
        }
        return this.url + '?t=' + Math.round(this.position);
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
};

export default Video;