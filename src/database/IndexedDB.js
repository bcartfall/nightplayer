/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import IDatabase from './IDatabase';

import { openDB } from 'idb';

export default class IndexedDB extends IDatabase {
    async init(settings) {
        this._settings = settings;

        // init indexeddb
        this._db = await openDB('nightplayer', 2, {
            upgrade(db, oldVersion, newVersion) {
                console.log(oldVersion, newVersion);
                if (oldVersion < 1) {
                    // v1
                    // Create a store of objects
                    const videos = db.createObjectStore('videos', {
                        keyPath: 'uuid',
                        autoIncrement: false,
                    });
                    // indices
                    videos.createIndex('order', 'order');
                }

                if (oldVersion < 2) {
                    // v2
                    const logs = db.createObjectStore('logs', {
                        keyPath: 'uuid',
                        autoIncrement: false,
                    });
                    logs.createIndex('video_id', 'video_id');
                    logs.createIndex('created_at', 'created_at');
                }
            },
        });
    }

    async get(table, key, options = {}) {
        //const where = options.where ?? [];
        const order = options.orderBy ?? ['order', 'asc'];

        if (key === '*') {
            // get all
            return await this._db.getAllFromIndex(table, order[0]); // get all from table ordered by 'order' 
        } else {
            // get one
            return await this._db.get(table, key);
        }
    }

    async put(table, key, value) {
        await this._db.put(table, value);
        return value;
    }

    async delete(table, key) {
        await this._db.delete(table, key);
    }
};