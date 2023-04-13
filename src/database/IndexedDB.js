/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import IDatabase from './IDatabase';
import Dexie from 'dexie';

export default class IndexedDB extends IDatabase {
    async init(settings) {
        this._settings = settings;

        // init indexeddb
        this._db = new Dexie('nightplayer');
        this._db.version(3).stores({
            videos: 'uuid, order', // Primary key and indexed props
            logs: 'uuid, video_id, created_at',
        });
    }

    async get(table, key, options = {}) {
        const where = options.where ?? [];
        const orderBy = options.orderBy ?? [['order', 'asc']];

        if (key === '*') {
            if (where.length > 0) {
                // where = [[key, '=', value]]
                //console.log(where[0][0], where[0][2]);
                let query = this._db[table].where(where[0][0]).equals(where[0][2]);
                if (orderBy[0][1] === 'desc') {
                    query = query.reverse();
                }
                query = query.sortBy(orderBy[0][0]);
                return await query;
            } else {
                // get all
                return await this._db[table].orderBy(orderBy[0][0]).toArray();
            }
        } else {
            // get one
            return await this._db[table].get(key);
        }
    }

    async put(table, key, value) {
        await this._db[table].put(value);
    }

    async delete(table, key, options = {}) {
        const where = options.where ?? [];

        if (key === '*') {
            if (where.length > 0) {
                this._db[table].where(where[0][0]).equals(where[0][2]).delete();
            } else {
                // delete all
                throw new Error('Delete all (*) not implemented yet.');
            }
        } else {
            // delete one
            await this._db[table].delete(key);
        }
    }
};