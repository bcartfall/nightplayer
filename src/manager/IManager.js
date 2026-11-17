/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2026-11-17
 * See README.md
 */

export default class IManager {
    construct() {
    }

    async init(settings) {
        throw new Error('Not implemented.');
    }

    async download(video) {
        throw new Error('Not implemented.');
    }

    async info(video) {
        throw new Error('Not implemented.');
    }

    async eventStream(managerVideo) {
        throw new Error('Not implemented.');
    }

    async delete(video) {
        throw new Error('Not implemented.');
    }
};