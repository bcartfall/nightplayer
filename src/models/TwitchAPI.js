/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

class TwitchAPI {
    constructor() {
        this.token = null;
    }

    setClient(twitch) {
        this.clientId = twitch.apiClientId;
        this.clientSecret = twitch.apiSecret;
    }

    async refreshToken() {
        const authUrl = `https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`;
        let response = await fetch(authUrl, {method: 'POST'});
        let token = await response.json();

        this.token = {
            access_token: token.access_token,
            expires_at: Date.now() + (token.expires_in * 1000),
        };
    }

    async request(url, method, parameters = null, attempts = 0) {
        if (!this.clientId || !this.clientSecret) {
            throw new Error('TwitchAPI client ID or secret not set.');
        }

        if (!this.token) {
            await this.refreshToken();
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token.access_token}`,
                    'Client-Id': this.clientId,
                }
            });
            const json = await response.json();

            if (json.status === 401 && attempts < 2) {
                console.log('Attempting to refresh TwitchAPI token.');
                await this.refreshToken();
                return this.request(url, method, parameters, attempts + 1);
            }

            return json;
        } catch (e) {
            console.log(e);
        }
    }

    async get(url, parameters) {
        const p = new URLSearchParams(parameters).toString();
        return this.request(url + '?' + p.toString(), 'GET');
    }
};

const api = new TwitchAPI();
export default api;